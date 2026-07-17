import time
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import TOKEN_AUDIENCE, decode_refresh_token
from app.core.token_blocklist import token_blocklist
from app.models.user import User, UserRole

DbSession = Annotated[Session, Depends(get_db)]

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciales invalidas o token expirado",
)


def get_current_user(
    db: DbSession,
    access_token: Annotated[str | None, Cookie()] = None,
) -> User:
    if not access_token:
        raise _CREDENTIALS_EXC
    try:
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], audience=TOKEN_AUDIENCE)

        # Reject refresh tokens or any non-access token
        if payload.get("type") != "access":
            raise _CREDENTIALS_EXC

        # Reject revoked tokens (logged-out sessions)
        jti = payload.get("jti")
        if jti and token_blocklist.is_blocked(jti):
            raise _CREDENTIALS_EXC

        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise _CREDENTIALS_EXC
        user_id = int(user_id_raw)
        token_version = int(payload.get("ver", 0))
    except (PyJWTError, ValueError, TypeError):
        # `from None` intencional -- no filtramos detalles internos del JWT
        # invalido al cliente, solo el 401 genérico.
        raise _CREDENTIALS_EXC from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    # Reject tokens issued before the last password change/reset
    if token_version != user.token_version:
        raise _CREDENTIALS_EXC
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(current_user: CurrentUser) -> User:
    """Dependency that allows only ADMIN users through."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user


AdminUser = Annotated[User, Depends(require_admin)]


def get_optional_admin(
    db: DbSession,
    access_token: Annotated[str | None, Cookie()] = None,
) -> User | None:
    """Como get_current_user, pero nunca lanza -- devuelve None si no hay
    sesión, el token es inválido, o el usuario no es admin. Se usa en
    endpoints públicos que quieren enriquecer la respuesta solo para
    admins logueados (ej. exponer costo/margen de productos) sin exigir
    autenticación al resto de los visitantes."""
    if not access_token:
        return None
    try:
        user = get_current_user(db, access_token)
    except HTTPException:
        return None
    return user if user.role == UserRole.ADMIN else None


OptionalAdmin = Annotated[User | None, Depends(get_optional_admin)]


# ---------------------------------------------------------------------------
# Refresh-token dependency  (used only by POST /auth/refresh)
# ---------------------------------------------------------------------------

def get_user_from_refresh_token(
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> User:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay sesion activa",
        )
    try:
        sub, jti, token_version, _exp = decode_refresh_token(refresh_token)
        user_id = int(sub)
    except (PyJWTError, ValueError, TypeError):
        # `from None` intencional -- no filtramos detalles internos del JWT
        # invalido al cliente, solo el 401 genérico.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado",
        ) from None

    # Reject already-rotated tokens (prevents replay if refresh token is stolen)
    if token_blocklist.is_blocked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado",
        )

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )

    # Reject tokens issued before the last password change/reset
    if token_version != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado",
        )

    # Blocklist the used JTI immediately (one-time use rotation).
    # TTL matches refresh token lifetime so the blocklist entry expires naturally.
    token_blocklist.block(jti, expires_at=time.time() + settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60)

    return user
