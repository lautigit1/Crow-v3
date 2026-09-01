import logging
import time
from datetime import datetime, timezone
from typing import Annotated

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from jwt import PyJWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.core import audit
from app.core.config import settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.deps import CurrentUser, DbSession, get_user_from_refresh_token
from app.core.email import build_reset_email, build_welcome_email, send_email
from app.core.passwords import validate_password_strength
from app.core.post_commit import PostCommit
from app.core.ratelimit import LoginRateLimiter, login_limiter
from app.core.security import (
    TOKEN_AUDIENCE,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_refresh_token,
    decode_reset_token,
    dummy_verify,
    hash_password,
    verify_password,
)
from app.core.token_blocklist import token_blocklist
from app.models.setting import Setting
from app.models.user import User, UserRole
from app.schemas.auth import AuthResponse, RegisterRequest
from app.schemas.setting import DEFAULT_SETTINGS
from app.schemas.user import UserRead

logger = logging.getLogger(__name__)

router = APIRouter()

_register_limiter = LoginRateLimiter(max_attempts=10, window_seconds=3600, lockout_seconds=3600)
_refresh_limiter  = LoginRateLimiter(max_attempts=30, window_seconds=300, lockout_seconds=60)
_reset_limiter    = LoginRateLimiter(max_attempts=5, window_seconds=3600, lockout_seconds=3600)

# IP-only limiters (sentinel "*" as the email part). The per-(ip, email)
# limiters above are trivially bypassed on public endpoints by rotating the
# email — each new email creates a fresh key. These cap total volume per IP.
_register_ip_limiter = LoginRateLimiter(
    max_attempts=settings.REGISTER_RATE_LIMIT_PER_IP, window_seconds=3600, lockout_seconds=3600
)
_reset_ip_limiter    = LoginRateLimiter(max_attempts=15, window_seconds=3600, lockout_seconds=3600)

# El 409 de "el email ya está registrado" es, además de una respuesta útil, un
# oráculo: dice si una dirección tiene cuenta acá. No se puede hacer genérico
# sin sacar el auto-login del alta (el alta buena devuelve sesión y la repetida
# no puede), así que en vez de cerrarlo se lo hace inservible para barrer una
# lista: este limitador cuenta SOLO los duplicados, aparte del cupo general.
#
# Que sea un contador separado es el punto. Con uno solo, los duplicados
# comparten presupuesto con las altas legítimas, y subir el costo de sondear
# obligaba a bajarle el tope a la gente que se registra de verdad. Así, una IP
# que recibe cinco "ya existe" en una hora queda bloqueada una hora --y a
# partir de ahí recibe 429 tanto para los emails con cuenta como para los que
# no, que es lo que corta la enumeración-- sin tocarle nada al alta normal.
_register_dup_limiter = LoginRateLimiter(max_attempts=5, window_seconds=3600, lockout_seconds=3600)

# El mismo hueco, del lado del login. `login_limiter` se llavea por
# (ip, email): protege UNA cuenta de que le prueben muchas contraseñas, y no
# hace absolutamente nada contra el caso inverso, que es el que se usa de
# verdad -- una contraseña común probada contra miles de emails, donde cada
# intento estrena una clave nueva y ningún contador llega jamás a cinco.
#
# El `limit_req` de nginx sobre /api/auth/ tampoco alcanza: 5 r/s son 18.000
# intentos por hora, de sobra para barrer una lista de correos filtrada.
#
# Solo suma con los FALLIDOS, y a diferencia del limitador por cuenta este no
# se resetea al entrar bien: si se limpiara con cada éxito, bastaría con tener
# una cuenta propia e ir intercalando logins válidos para no gastar nunca el
# tope.
_login_ip_limiter = LoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_PER_IP,
    window_seconds=3600,
    lockout_seconds=settings.LOGIN_RATE_LOCKOUT_SECONDS,
)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _auth_response(user: User, response: Response) -> AuthResponse:
    access_token = create_access_token(subject=user.id, role=user.role.value, token_version=user.token_version)
    refresh_token = create_refresh_token(subject=user.id, token_version=user.token_version)
    set_auth_cookies(response, access_token, refresh_token)
    return AuthResponse(user=UserRead.model_validate(user))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    db: DbSession,
    request: Request,
    response: Response,
    background_tasks: PostCommit,
) -> AuthResponse:
    ip = audit.client_ip(request)
    locked_for = (
        _register_limiter.check(ip, data.email)
        or _register_ip_limiter.check(ip, "*")
        or _register_dup_limiter.check(ip, "*")
    )
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados registros. Reintenta en {int(locked_for)} segundos.",
        )

    validate_password_strength(data.password)

    exists = db.scalar(select(User).where(User.email == data.email))
    if exists:
        _register_limiter.register_failure(ip, data.email)
        _register_ip_limiter.register_failure(ip, "*")
        _register_dup_limiter.register_failure(ip, "*")
        # Queda asentado para que un barrido se vea. Sin esto, la única huella
        # de alguien probando mil direcciones es el 429 del final, y recién
        # cuando ya probó las mil.
        audit.record_standalone(
            action="register.duplicate", actor_email=data.email, request=request
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya esta registrado")

    # Count successful registrations against the per-IP cap too — otherwise
    # mass account creation with unique emails is never throttled.
    _register_ip_limiter.register_failure(ip, "*")

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

    # Por la cola post-commit, como el resto de los correos: sin esto la persona
    # espera al SMTP para poder entrar, y si el servidor de correo está lento o
    # caído el registro falla por algo que no tiene nada que ver con registrarse.
    # Y sale recién con la fila ya confirmada -- que es de dónde salió esta cola:
    # con `BackgroundTasks` el correo se mandaba antes del commit.
    #
    # El número sale de `settings` y no de una constante: es editable desde el
    # panel, y un correo de bienvenida con un WhatsApp viejo es peor que no
    # mandarlo.
    background_tasks.add_task(
        _enviar_bienvenida, to=user.email, name=user.full_name, whatsapp=_whatsapp_configurado(db)
    )
    return _auth_response(user, response)


def _whatsapp_configurado(db: DbSession) -> str:
    numero = db.scalar(select(Setting.value).where(Setting.key == "whatsapp_number"))
    return numero or DEFAULT_SETTINGS["whatsapp_number"]


def _enviar_bienvenida(*, to: str, name: str, whatsapp: str) -> None:
    """Envuelto en try/except a propósito: el mismo criterio que `notificar()`.

    Que no salga la bienvenida es un inconveniente. Que un registro explote
    porque el SMTP rechazó la conexión es un problema -- y acá ya corre después
    de la respuesta, así que la excepción no llegaría a nadie: quedaría como un
    error sin dueño en los logs.
    """
    try:
        # Import adentro y no arriba, igual que en `core/notify.py`: un
        # `from ... import send_email` a nivel de módulo copia la referencia, y
        # entonces parchear `app.core.email.send_email` -- que es como los otros
        # nueve archivos de tests interceptan el correo -- no tiene efecto acá.
        # Una sola forma de simular el envío en toda la suite vale más que
        # ahorrar una línea.
        from app.core.email import send_email as enviar

        enviar(**build_welcome_email(to=to, name=name, whatsapp_number=whatsapp))
    except Exception as exc:  # noqa: BLE001 -- deliberado, ver docstring
        logger.warning("No se pudo enviar la bienvenida a %s: %s", to, exc)


@router.post("/login", response_model=AuthResponse)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession, request: Request, response: Response) -> AuthResponse:
    ip = audit.client_ip(request)

    locked_for = login_limiter.check(ip, form.username) or _login_ip_limiter.check(ip, "*")
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos. Reintenta en {int(locked_for)} segundos.",
        )

    user = db.scalar(select(User).where(User.email == form.username))
    # `dummy_verify` cuando no hay cuenta: sin esa rama, un email inexistente
    # se responde sin correr bcrypt y vuelve en un milisegundo, contra los
    # ~250 ms de uno que sí existe. La diferencia se mide con una sola
    # petición y convierte al login en un oráculo de quién es cliente.
    if user is None:
        dummy_verify(form.password)
    if not user or not verify_password(form.password, user.hashed_password):
        login_limiter.register_failure(ip, form.username)
        _login_ip_limiter.register_failure(ip, "*")
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
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> None:
    if access_token:
        try:
            # `audience` explícito -- sin esto, PyJWT rechaza cualquier token
            # que traiga un claim `aud` (todos los nuestros lo traen) si no
            # se le pasa el valor esperado, a diferencia de python-jose que
            # lo dejaba pasar en silencio. Sin este fix, ningún access token
            # se blocklistea al hacer logout bajo PyJWT (el `except Exception`
            # de abajo se comía el error sin que se notara).
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], audience=TOKEN_AUDIENCE)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                token_blocklist.block(jti, float(exp))
        except Exception:
            pass

    # Also revoke the refresh token — without this, a stolen refresh token
    # keeps working after logout until it expires. The refresh cookie is
    # scoped to /api/auth so the browser sends it here (see core/cookies.py).
    if refresh_token:
        try:
            _, refresh_jti, _, refresh_exp = decode_refresh_token(refresh_token)
            token_blocklist.block(refresh_jti, refresh_exp)
        except Exception:
            pass  # expired/corrupt cookie — nothing to revoke

    clear_auth_cookies(response)
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
    background_tasks: PostCommit,
) -> None:
    """Always returns 204 regardless of whether the email exists (prevents user enumeration)."""
    ip = audit.client_ip(request)
    locked_for = _reset_limiter.check(ip, data.email) or _reset_ip_limiter.check(ip, "*")
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiadas solicitudes. Reintenta en {int(locked_for)} segundos.",
        )
    _reset_limiter.register_failure(ip, data.email)
    _reset_ip_limiter.register_failure(ip, "*")

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
    invalid_exc = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El enlace es invalido o ya expiro.",
    )
    try:
        user_id, jti = decode_reset_token(data.token)
    except (PyJWTError, ValueError):
        # `from None` intencional -- no queremos filtrar detalles internos
        # del token invalido/expirado al cliente, solo el mensaje genérico.
        raise invalid_exc from None

    if token_blocklist.is_blocked(jti):
        raise invalid_exc
    token_blocklist.block(jti, expires_at=time.time() + 7200)

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise invalid_exc

    validate_password_strength(data.new_password)
    user.hashed_password = hash_password(data.new_password)
    # Invalidate every session issued before this reset (see users.token_version)
    user.token_version += 1
    db.add(user)
    audit.record(db, action="password.reset_completed", actor=user, entity="user", entity_id=user.id, request=request)
