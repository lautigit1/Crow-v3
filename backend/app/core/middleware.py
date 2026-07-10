"""
HTTP middleware stack for Crow Repuestos API.

Middlewares (applied bottom-up in FastAPI):
  1. CSRFOriginMiddleware       — rejects mutating cross-origin requests
  2. SecurityHeadersMiddleware  — security + CSP headers on every response
  3. RequestIDMiddleware        — attaches X-Request-ID to every request/response
  4. RequestLoggingMiddleware   — structured JSON log per request with timing
"""

import time
import uuid
from urllib.parse import urlsplit

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger("crow.http")

# ---------------------------------------------------------------------------
# CSRF — Origin validation
# ---------------------------------------------------------------------------
_MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


class CSRFOriginMiddleware(BaseHTTPMiddleware):
    """
    Second CSRF layer on top of SameSite=lax cookies.

    For mutating methods, if the request carries an Origin header it must be
    either one of the configured CORS origins or the API's own origin
    (Origin host == Host header — covers the same-origin nginx proxy and
    Swagger in dev). Otherwise the request is rejected with 403 even if it
    carries valid auth cookies.

    Requests WITHOUT an Origin header are allowed: non-browser clients (curl,
    scripts, tests) don't send it, and modern browsers always attach Origin
    to cross-site mutating requests — which is exactly the case we block.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin")
        # Note: Origin "null" (sandboxed iframes, some redirects) is validated
        # like any other value and ends up rejected — that's intentional.
        if request.method in _MUTATING_METHODS and origin:
            if origin not in settings.cors_origins:
                origin_host = urlsplit(origin).netloc
                request_host = request.headers.get("host", "")
                if not origin_host or origin_host != request_host:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Origen no permitido (posible CSRF)"},
                    )
        return await call_next(request)

# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------
_BASE_SECURITY_HEADERS: dict[str, str] = {
    # Prevent MIME-type sniffing
    "X-Content-Type-Options": "nosniff",
    # Disallow framing (clickjacking)
    "X-Frame-Options": "DENY",
    # Don't leak full referrer to cross-origin destinations
    "Referrer-Policy": "strict-origin-when-cross-origin",
    # Disable legacy XSS auditor (causes more harm than good in modern browsers)
    "X-XSS-Protection": "0",
    # Restrict browser feature access
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
    # Strict CSP for a pure JSON API: no scripts, no resources, no framing
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    # Prevent cross-origin resource leaks
    "Cross-Origin-Resource-Policy": "same-origin",
    # Isolate browsing context (required for high-resolution timers, SharedArrayBuffer)
    "Cross-Origin-Opener-Policy": "same-origin",
}

# HSTS: only sent over HTTPS in production.
# 1-year max-age with includeSubDomains; preload flag opts into browser preload lists.
_HSTS_HEADER = "max-age=31536000; includeSubDomains; preload"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for header, value in _BASE_SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        if settings.is_production:
            response.headers.setdefault("Strict-Transport-Security", _HSTS_HEADER)
        return response


# ---------------------------------------------------------------------------
# Request ID
# ---------------------------------------------------------------------------
class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Reads X-Request-ID from the incoming request (set by load balancers / API
    gateways), or generates a UUID4 if absent. Echoes it back on the response
    so clients can correlate logs.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id  # available to route handlers
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ---------------------------------------------------------------------------
# Request logging
# ---------------------------------------------------------------------------
_SKIP_PATHS = frozenset({"/api/health", "/favicon.ico", "/docs", "/openapi.json", "/redoc"})


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Emits one structured log line per HTTP request:
      method, path, status_code, duration_ms, request_id
    4xx logs at WARNING, 5xx at ERROR, 2xx/3xx at INFO.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        ms = round((time.perf_counter() - start) * 1000, 1)

        request_id = getattr(request.state, "request_id", "-")
        status = response.status_code

        extra = {
            "method": request.method,
            "path": request.url.path,
            "status": status,
            "ms": ms,
            "request_id": request_id,
        }

        msg = f"{request.method} {request.url.path} → {status} ({ms}ms)"
        if status >= 500:
            logger.error(msg, extra=extra)
        elif status >= 400:
            logger.warning(msg, extra=extra)
        else:
            logger.info(msg, extra=extra)

        return response
