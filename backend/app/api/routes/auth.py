from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from sqlalchemy import select

from app.core import audit
from app.core.config import settings
from app.core.deps import CurrentUser, DbSession, get_user_from_refresh_token, oauth2_scheme
from app.core.passwords import validate_password_strength
from app.core.ratelimit import login_limiter
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.core.token_blocklist import token_blocklist
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, Token
from app.schemas.user import UserRead

router = APIRouter()

# Reuse the same limiter pattern for registration (keyed by IP)
from app.core.ratelimit import LoginRateLimiter
_register_limiter = LoginRateLimiter(max_attempts=10, window_seconds=3600, lockout_seconds=3600)


def _token_for(user: User) -> Token:
    """Build a Token response containing both access and refresh tokens."""
    return Token(
        access_token=create_access_token(subject=user.id, role=user.role.value),
        refresh_token=create_refresh_token(subject=user.id),
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession, request: Request) -> Token:
    ip = audit.client_ip(request)
    locked_for = _register_limiter.check(ip, ip or "anon")
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados registros desde esta IP. Reintentá en {int(locked_for)} segundos.",
        )

    validate_password_strength(data.password)

    exists = db.scalar(select(User).where(User.email == data.email))
    if exists:
        # Still count the attempt to slow enumeration via timing
        _register_limiter.register_failure(ip, ip or "anon")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")

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
    _register_limiter.register_failure(ip, ip or "anon")  # count every registration
    audit.record(db, action="user.register", actor=user, entity="user", entity_id=user.id, request=request)
    return _token_for(user)


@router.post("/login", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession, request: Request) -> Token:
    ip = audit.client_ip(request)

    locked_for = login_limiter.check(ip, form.username)
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos. Reintentá en {int(locked_for)} segundos.",
        )

    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.hashed_password):
        login_limiter.register_failure(ip, form.username)
        audit.record_standalone(
            action="login.failure",
            actor_email=form.username,
            detail="credenciales inválidas",
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos")

    if not user.is_active:
        audit.record_standalone(action="login.blocked", actor=user, detail="cuenta desactivada", request=request)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    login_limiter.reset(ip, form.username)
    audit.record(db, action="login.success", actor=user, request=request)
    return _token_for(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    current_user: CurrentUser,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
    request: Request,
) -> None:
    """
    Revoke the current access token by adding its JTI to the blocklist.
    The token remains syntactically valid but will be rejected on every
    subsequent request until its natural expiry.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            token_blocklist.block(jti, float(exp))
    except Exception:
        pass  # If decode fails here the token was invalid anyway

    audit.record(db, action="logout", actor=current_user, request=request)


@router.post("/refresh", response_model=Token)
def refresh_tokens(
    current_user: Annotated[User, Depends(get_user_from_refresh_token)],
    db: DbSession,
    request: Request,
) -> Token:
    """
    Exchange a valid refresh token for a new access + refresh token pair.
    Both tokens are rotated on every call (refresh token rotation).
    """
    audit.record(db, action="token.refresh", actor=current_user, request=request)
    return _token_for(current_user)


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> User:
    return current_user
