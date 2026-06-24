import time
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_refresh_token
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
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

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
    except (JWTError, ValueError, TypeError):
        raise _CREDENTIALS_EXC

    user = db.get(User, user_id)
    if user is None or not user.is_active:
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
        sub, jti = decode_refresh_token(refresh_token)
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado",
        )

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

    # Blocklist the used JTI immediately (one-time use rotation).
    # TTL matches refresh token lifetime so the blocklist entry expires naturally.
    token_blocklist.block(jti, expires_at=time.time() + settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60)

    return user
