"""
HTTP middleware stack for Crow Repuestos API.

Middlewares (applied bottom-up in FastAPI):
  1. CSRFOriginMiddleware       — rejects mutating cross-origin requests
  2. SecurityHeadersMiddleware  — security + CSP headers on every response
  3. RequestIDMiddleware        — attaches X-Request-ID to every request/response
  4. RequestLoggingMiddleware   — structured JSON log per request with timing
  5. RateLimitMiddleware        — tope general de requests por IP sobre /api
"""

import time
import uuid
from urllib.parse import urlsplit

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.ratelimit import IPRateLimiter

logger = get_logger("crow.http")

# Cubetas del tope general por IP (ver RateLimitMiddleware). A nivel de módulo
# para que haya una sola instancia por proceso, igual que los limitadores de
# `routes/auth.py`.
_api_limiter = IPRateLimiter(
    "api", settings.API_RATE_LIMIT_PER_IP, settings.API_RATE_WINDOW_SECONDS
)
_api_write_limiter = IPRateLimiter(
    "api_write", settings.API_WRITE_RATE_LIMIT_PER_IP, settings.API_RATE_WINDOW_SECONDS
)

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


# Swagger UI y ReDoc cargan su JavaScript y su CSS desde jsdelivr. Con la CSP
# de arriba (`default-src 'none'`) el navegador bloquea todo y `/docs` responde
# 200 pero se ve en blanco -- que es exactamente lo que pasaba.
#
# La excepción es acotada a estas tres rutas y **solo existe fuera de
# producción**: allá `docs_url`, `redoc_url` y `openapi_url` valen `None` (ver
# main.py), así que estas rutas ni siquiera están registradas y la CSP estricta
# vuelve a aplicarse a todo sin excepciones.
_RUTAS_DOCS = frozenset({"/docs", "/redoc", "/docs/oauth2-redirect"})
_CSP_DOCS = (
    "default-src 'none'; "
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "font-src 'self' https://cdn.jsdelivr.net; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for header, value in _BASE_SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)

        if not settings.is_production and request.url.path in _RUTAS_DOCS:
            # `setdefault` no alcanza: la clave ya la puso el bucle de arriba.
            response.headers["Content-Security-Policy"] = _CSP_DOCS

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
# Rate limit general por IP
# ---------------------------------------------------------------------------
class RateLimitMiddleware(BaseHTTPMiddleware):
    """Tope general por IP sobre `/api`, como respaldo del `limit_req` de nginx.

    Va acá y no como dependencia de FastAPI porque tiene que aplicar a TODA la
    superficie, incluidas las rutas que todavía no existen: una dependencia hay
    que acordarse de ponerla en cada router nuevo, y la que falte no se nota
    hasta que alguien la usa para algo.

    Dos cubetas sobre la misma IP: una general y otra más chica solo para los
    métodos que escriben. La separación es lo que hace útil el tope: navegar el
    catálogo son decenas de GET legítimos por minuto, mientras que sesenta
    escrituras en el mismo minuto ya no es alguien cargando productos a mano.

    Es el ÚLTIMO middleware de la cadena (el más interno) a propósito: así el
    429 sale con las cabeceras de seguridad, con su X-Request-ID y queda en el
    log de accesos como cualquier otra respuesta. Lo que se ahorra rechazando
    antes -- cuatro middlewares que no tocan la base -- no vale perder la traza
    justo de las requests que interesa investigar.
    """

    # Health lo consulta el balanceador cada pocos segundos y no debe fallar
    # nunca por un vecino ruidoso. `/api/events` es SSE: UNA request que queda
    # abierta horas, así que contarla no significa nada, y el límite real de
    # conexiones simultáneas es harina de otro costal.
    _EXENTAS = frozenset({"/api/health", "/api/events"})

    async def dispatch(self, request: Request, call_next) -> Response:
        ruta = request.url.path
        if not ruta.startswith("/api") or ruta in self._EXENTAS:
            return await call_next(request)

        # Import adentro: `core.audit` importa modelos, y a nivel de módulo
        # esto crearía un ciclo con la cadena de imports de la aplicación.
        from app.core.audit import client_ip
        from app.core.redis_client import RedisCaido

        ip = client_ip(request)

        # `RedisCaido` se atiende acá adentro y no con el handler de
        # `core/exceptions.py`: los handlers de FastAPI solo alcanzan a las
        # excepciones que salen de una ruta o sus dependencias. Lo que revienta
        # dentro de un middleware pasa de largo y termina en el 500 genérico,
        # que diría "error interno" cuando lo que pasa es que Redis está caído.
        try:
            espera = _api_limiter.retry_after(ip)
            if espera is None and request.method in _MUTATING_METHODS:
                espera = _api_write_limiter.retry_after(ip)
        except RedisCaido:
            logger.error("RedisCaido en el rate limit general", extra={"path": ruta})
            return JSONResponse(
                status_code=503,
                content={"detail": "Servicio temporalmente no disponible. Intente nuevamente en unos momentos."},
            )

        if espera is not None:
            logger.warning(
                "Rate limit por IP alcanzado",
                extra={"method": request.method, "path": ruta, "ip": ip, "retry_after": espera},
            )
            return JSONResponse(
                status_code=429,
                content={"detail": f"Demasiadas solicitudes. Reintentá en {espera} segundos."},
                headers={"Retry-After": str(espera)},
            )

        return await call_next(request)


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
