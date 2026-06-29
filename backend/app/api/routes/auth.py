from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.core import audit
from app.core.config import settings
from app.core.deps import CurrentUser, DbSession, get_user_from_refresh_token
from app.core.email import build_reset_email, send_email
from app.core.passwords import validate_password_strength
from app.core.ratelimit import login_limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    verify_password,
)
from app.core.token_blocklist import token_blocklist
from app.models.user import User, UserRole
from app.schemas.auth import AuthResponse, RegisterRequest
from app.schemas.user import UserRead

router = APIRouter()

from app.core.ratelimit import LoginRateLimiter
_register_limiter = LoginRateLimiter(max_attempts=10, window_seconds=3600, lockout_seconds=3600)
_refresh_limiter  = LoginRateLimiter(max_attempts=30, window_seconds=300, lockout_seconds=60)
_reset_limiter    = LoginRateLimiter(max_attempts=5, window_seconds=3600, lockout_seconds=3600)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set both tokens as HttpOnly cookies. JavaScript cannot read or write these."""
    secure = settings.is_production
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        path="/api/auth/refresh",
    )


def _clear_auth_cookies(response: Response) -> None:
    """Remove both auth cookies from the browser."""
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    response.delete_cookie(key="refresh_token", path="/api/auth/refresh", httponly=True, samesite="lax")


def _auth_response(user: User, response: Response) -> AuthResponse:
    access_token = create_access_token(subject=user.id, role=user.role.value)
    refresh_token = create_refresh_token(subject=user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return AuthResponse(user=UserRead.model_validate(user))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession, request: Request, response: Response) -> AuthResponse:
    ip = audit.client_ip(request)
    locked_for = _register_limiter.check(ip, ip or "anon")
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados registros desde esta IP. Reintenta en {int(locked_for)} segundos.",
        )

    validate_password_strength(data.password)

    exists = db.scalar(select(User).where(User.email == data.email))
    if exists:
        _register_limiter.register_failure(ip, ip or "anon")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya esta registrado")

    user = User(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=UserRole.USER,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    audit.record(db, action="user.register", actor=user, entity="user", entity_id=user.id, request=request)
    return _auth_response(user, response)


@router.post("/login", response_model=AuthResponse)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession, request: Request, response: Response) -> AuthResponse:
    ip = audit.client_ip(request)

    locked_for = login_limiter.check(ip, form.username)
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos. Reintenta en {int(locked_for)} segundos.",
        )

    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.hashed_password):
        login_limiter.register_failure(ip, form.username)
        audit.record_standalone(
            action="login.failure",
            actor_email=form.username,
            detail="credenciales invalidas",
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contrasena incorrectos")

    if not user.is_active:
        audit.record_standalone(action="login.blocked", actor=user, detail="cuenta desactivada", request=request)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    login_limiter.reset(ip, form.username)
    audit.record(db, action="login.success", actor=user, request=request)
    return _auth_response(user, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    current_user: CurrentUser,
    response: Response,
    db: DbSession,
    request: Request,
    access_token: Annotated[str | None, Cookie()] = None,
) -> None:
    if access_token:
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                token_blocklist.block(jti, float(exp))
        except Exception:
            pass

    _clear_auth_cookies(response)
    audit.record(db, action="logout", actor=current_user, request=request)


@router.post("/refresh", response_model=AuthResponse)
def refresh_tokens(
    current_user: Annotated[User, Depends(get_user_from_refresh_token)],
    db: DbSession,
    request: Request,
    response: Response,
) -> AuthResponse:
    """Rotate both tokens and reissue them as fresh HttpOnly cookies."""
    ip = audit.client_ip(request)
    locked_for = _refresh_limiter.check(ip, ip or "anon")
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiadas solicitudes. Reintenta en {int(locked_for)} segundos.",
        )
    audit.record(db, action="token.refresh", actor=current_user, request=request)
    return _auth_response(current_user, response)


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> User:
    return current_user


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(
    data: ForgotPasswordRequest,
    db: DbSession,
    request: Request,
    background_tasks: BackgroundTasks,
) -> None:
    """Always returns 204 regardless of whether the email exists (prevents user enumeration)."""
    ip = audit.client_ip(request)
    locked_for = _reset_limiter.check(ip, data.email)
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiadas solicitudes. Reintenta en {int(locked_for)} segundos.",
        )
    _reset_limiter.register_failure(ip, data.email)

    user = db.scalar(select(User).where(User.email == data.email, User.is_active.is_(True)))
    if user:
        token, _ = create_reset_token(user.id)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        background_tasks.add_task(
            send_email,
            **build_reset_email(to=user.email, reset_url=reset_url, name=user.full_name),
        )
        audit.record(db, action="password.reset_requested", actor=user, entity="user", entity_id=user.id, request=request)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(data: ResetPasswordRequest, db: DbSession, request: Request) -> None:
    """Validates the reset token, updates the password, and blocklists the JTI."""
    import time as _time
    invalid_exc = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El enlace es invalido o ya expiro.",
    )
    try:
        user_id, jti = decode_reset_token(data.token)
    except (JWTError, ValueError):
        raise invalid_exc

    if token_blocklist.is_blocked(jti):
        raise invalid_exc
    token_blocklist.block(jti, expires_at=_time.time() + 7200)

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise invalid_exc

    validate_password_strength(data.new_password)
    user.hashed_password = hash_password(data.new_password)
    db.add(user)
    audit.record(db, action="password.reset_completed", actor=user, entity="user", entity_id=user.id, request=request)
                                                         