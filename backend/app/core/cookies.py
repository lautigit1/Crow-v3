"""
Auth cookie helpers — shared by the auth routes (login/register/refresh/logout)
and the users routes (password change re-issues cookies).

Both tokens travel as HttpOnly cookies: JavaScript can never read or write them.

The refresh cookie is scoped to /api/auth (not just /api/auth/refresh) so the
browser also sends it to /api/auth/logout — logout needs it to blocklist the
refresh token's JTI. Every endpoint under /api/auth is auth-related, so the
wider scope leaks the cookie nowhere sensitive.
"""

from fastapi import Response

from app.core.config import settings

# Old scope used before the security-hardening change. Kept only so
# clear_auth_cookies() can delete stale cookies issued under the old path
# during the transition window (refresh tokens live <= 60 min).
_LEGACY_REFRESH_PATH = "/api/auth/refresh"

REFRESH_COOKIE_PATH = "/api/auth"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set both tokens as HttpOnly cookies."""
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
        path=REFRESH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    """Remove both auth cookies from the browser."""
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    response.delete_cookie(key="refresh_token", path=REFRESH_COOKIE_PATH, httponly=True, samesite="lax")
    response.delete_cookie(key="refresh_token", path=_LEGACY_REFRESH_PATH, httponly=True, samesite="lax")
