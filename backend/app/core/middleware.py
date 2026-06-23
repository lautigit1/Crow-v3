"""
HTTP middleware stack for Crow Repuestos API.

Middlewares (applied bottom-up in FastAPI):
  1. SecurityHeadersMiddleware  — security + CSP headers on every response
  2. RequestIDMiddleware        — attaches X-Request-ID to every request/response
  3. RequestLoggingMiddleware   — structured JSON log per request with timing
"""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import get_logger

logger = get_logger("crow.http")

# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "0",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    # APIs don't serve HTML, but this is a safety net for accidental HTML responses.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    # Uncomment once TLS is confirmed in production:
    # "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
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
