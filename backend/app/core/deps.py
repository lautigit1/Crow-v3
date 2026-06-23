from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_refresh_token
from app.core.token_blocklist import token_blocklist
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

DbSession = Annotated[Session, Depends(get_db)]

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciales inválidas o token expirado",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    db: DbSession,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

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
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    try:
        user_id = int(decode_refresh_token(token))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )
    return user
