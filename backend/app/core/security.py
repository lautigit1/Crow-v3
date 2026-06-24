import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt only considers the first 72 bytes of the password and raises on longer
# inputs, so we truncate explicitly before hashing/verifying.
_BCRYPT_MAX_BYTES = 72


def _prepare(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# Access token  (short-lived, 30 min by default)
# ---------------------------------------------------------------------------

def create_access_token(subject: str | int, role: str) -> str:
    """
    Issues a signed JWT carrying the user id (sub), role, and a unique jti.
    The jti enables token revocation via the TokenBlocklist.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4()),   # unique per token — used for revocation
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------

_REFRESH_SECRET = settings.SECRET_KEY + ":refresh"  # separate signing secret


def create_refresh_token(subject: str | int) -> str:
    """
    Issues a refresh token. Expires after REFRESH_TOKEN_EXPIRE_MINUTES (default 60).
    Intentionally excludes the role so privilege changes take effect
    immediately when the access token expires.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, _REFRESH_SECRET, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> tuple[str, str]:
    """
    Validates and decodes a refresh token.
    Returns (subject, jti) or raises JWTError.
    The JTI should be blocklisted after rotation to prevent replay attacks.
    """
    payload = jwt.decode(token, _REFRESH_SECRET, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "refresh":
        raise JWTError("Invalid token type")
    sub = payload.get("sub")
    jti = payload.get("jti")
    if sub is None or jti is None:
        raise JWTError("Malformed token")
    return sub, jti


# ---------------------------------------------------------------------------
# Password reset token  (one-time use, 60 min by default)
# ---------------------------------------------------------------------------

_RESET_SECRET = settings.SECRET_KEY + ":reset"


def create_reset_token(user_id: int) -> tuple[str, str]:
    """
    Issues a signed password-reset JWT.
    Returns (token, jti) — caller must blocklist the JTI after use to prevent
    replay attacks.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user_id),
        "type": "reset",
        "jti": jti,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, _RESET_SECRET, algorithm=settings.ALGORITHM), jti


def decode_reset_token(token: str) -> tuple[int, str]:
    """
    Validates a reset token.
    Returns (user_id, jti) or raises JWTError.
    """
    payload = jwt.decode(token, _RESET_SECRET, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "reset":
        raise JWTError("Invalid token type")
    sub = payload.get("sub")
    jti = payload.get("jti")
    if sub is None or jti is None:
        raise JWTError("Malformed token")
    return int(sub), jti
