"""
Crow Repuestos API -- application entry point.

Startup sequence:
  1. Configure structured JSON logging
  2. Connect Redis and the event broker (the schema comes from Alembic,
     applied by docker-entrypoint.sh before the app starts)
  3. Register middleware (order matters -- outermost applied first)
  4. Register global exception handlers
  5. Mount API router
  6. Expose /api/health for load-balancer checks
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 -- registers models on Base before migrations
from app.api import api_router
from app.api.routes.seo import router as seo_router
from app.core.config import settings
from app.core.database import check_db_connection, engine
from app.core.error_tracking import init_sentry
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging, get_logger
from app.core.middleware import (
    CSRFOriginMiddleware,
    RateLimitMiddleware,
    RequestIDMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.unit_of_work import UnitOfWorkMiddleware

logger = get_logger("crow.startup")

# Antes de crear la app -- la integración de Sentry con FastAPI/Starlette
# necesita estar activa antes de que se registren las rutas y el middleware
# para poder capturar excepciones en cualquiera de ellos. No-op si
# SENTRY_DSN no está configurada (ver core/error_tracking.py).
init_sentry()


def _wait_for_db(retries: int = 10, delay: float = 2.0) -> None:
    import os
    import time
    if os.getenv("TESTING"):
        return  # skip DB check in test environment
    for attempt in range(1, retries + 1):
        if check_db_connection():
            logger.info("Database is reachable", extra={"attempt": attempt})
            return
        wait = delay * (2 ** (attempt - 1))
        logger.warning(f"DB not ready (attempt {attempt}/{retries}), retrying in {wait:.0f}s...")
        time.sleep(wait)
    raise RuntimeError(f"Database unreachable after {retries} attempts -- aborting startup.")


_INSECURE_SECRET = "change-me-in-production-please"
_INSECURE_SEED_PASSWORD = "admin1234"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY == _INSECURE_SECRET:
        raise RuntimeError(
            "SECRET_KEY no está configurada. "
            "Seteá la variable de entorno SECRET_KEY antes de iniciar. "
            "Podés generar una clave segura con: openssl rand -hex 32"
        )

    # El seed crea el admin con esta contraseña si nadie la define. Sin esta
    # guarda, un deploy que se olvide de `SEED_ADMIN_PASSWORD` arranca con la
    # cuenta que controla precios, stock y pedidos protegida por "admin1234",
    # y **no hay ningún síntoma**: la app funciona perfecto. Es el peor tipo de
    # agujero, el que no se nota.
    #
    # Solo en producción: en desarrollo el default es una comodidad real y
    # además lo usan los tests E2E.
    if settings.is_production and settings.SEED_ADMIN_PASSWORD == _INSECURE_SEED_PASSWORD:
        raise RuntimeError(
            "SEED_ADMIN_PASSWORD sigue en el default de desarrollo. "
            "Seteá la variable de entorno con una contraseña propia antes de iniciar."
        )

    if settings.is_production and settings.has_insecure_cors:
        raise RuntimeError(
            "BACKEND_CORS_ORIGINS contiene localhost/127.0.0.1 con ENVIRONMENT=production. "
            "Seteá la variable de entorno BACKEND_CORS_ORIGINS con el dominio real "
            "antes de iniciar (ej: https://crowrepuestos.com)."
        )

    if settings.is_production and not settings.REDIS_URL:
        # Sin Redis, la blocklist de tokens y los rate limits viven en memoria
        # por proceso: con más de un worker/instancia la revocación de sesiones
        # deja de ser consistente en silencio. Mejor no arrancar.
        raise RuntimeError(
            "REDIS_URL no está configurada con ENVIRONMENT=production. "
            "La revocación de tokens y el rate limiting requieren Redis para "
            "ser consistentes entre workers (ej: redis://:password@redis:6379/0)."
        )

    configure_logging(level="DEBUG" if not settings.is_production else "INFO")

    if settings.is_production and not settings.trusted_proxy_networks:
        # No es fatal (un deploy sin proxy reverso es legítimo), pero detrás de
        # nginx/Caddy sin esto todas las requests aparecen con la IP del proxy:
        # audit logs inútiles y rate limiting agrupando a todos los usuarios.
        logger.warning(
            "TRUSTED_PROXIES está vacía en producción — si el API corre detrás "
            "de un proxy reverso, seteala (ej: 172.28.0.0/16) para ver las IPs "
            "reales de los clientes."
        )
    logger.info(
        "Starting Crow Repuestos API",
        extra={
            "environment": settings.ENVIRONMENT,
            "version": "1.3.0",
            "db_pool_size": settings.DB_POOL_SIZE,
            "access_token_ttl_min": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        },
    )

    _wait_for_db()

    if settings.REDIS_URL:
        from app.core.redis_client import init_redis

        conectado = init_redis(settings.REDIS_URL)
        # En producción no arrancamos sin Redis, y no es celo de más: la
        # comprobación de arriba ya obliga a configurar REDIS_URL ahí, así que
        # llegar acá sin conexión significa que el store del que dependen la
        # blocklist y los rate limits NO está. Seguir sería levantar la API con
        # los fallbacks en memoria puestos -- exactamente el estado que
        # `sin_redis()` se niega a servir en caliente (ver redis_client.py).
        # Mejor que el deploy falle fuerte y visible que quedar en pie
        # atendiendo requests con la revocación de sesiones apagada.
        if not conectado and settings.is_production:
            raise RuntimeError(
                "REDIS_URL está configurada pero no se pudo conectar. "
                "La revocación de tokens y el rate limiting dependen de Redis; "
                "el API no arranca sin él en producción."
            )
    else:
        logger.info("REDIS_URL no configurada — usando stores en memoria")

    # El broker de eventos necesita una referencia al event loop para poder
    # publicar desde los handlers sync, que corren en un hilo del threadpool.
    # `asyncio.Queue.put_nowait` no es thread-safe: sin esto habría que
    # llamarlo desde otro hilo y fallaría de forma intermitente.
    # Solo aplica al fallback en memoria; con Redis el publish es sync y no
    # toca el loop.
    import asyncio as _asyncio

    from app.core.events import registrar_loop

    registrar_loop(_asyncio.get_running_loop())

    # La app no crea tablas en ningún entorno: el esquema lo arma siempre
    # Alembic. Crear tablas desde acá volvería a dar dos definiciones del
    # esquema, que es lo que dejó rota la cadena de migraciones anterior sin
    # que nadie lo notara (ver alembic/versions/021_esquema_base.py).

    yield

    logger.info("Shutting down -- disposing DB connection pool")
    engine.dispose()
    from app.core.redis_client import close_redis
    close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.3.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# Middleware (applied in reverse order -- last added = outermost)
# Outermost -> innermost:
#   CORS -> CSRF origin check -> Security headers -> Request ID -> Request
#   logging -> Rate limit -> Unit of Work
#
# El Unit of Work va PRIMERO (el más interno): pegado a la ruta, para que el
# commit ocurra lo antes posible y para no envolver requests que ni llegan a
# tocar la base (un 429 del rate limit, por ejemplo). Ver core/unit_of_work.py.
#
# El rate limit va ÚLTIMO (o sea, el más interno) para que el 429 pase de
# vuelta por el logging y por las cabeceras de seguridad como cualquier otra
# respuesta. Rechazar más afuera ahorraría cuatro middlewares que igual no
# tocan la base, y a cambio dejaría sin traza justo a las requests que uno
# quiere mirar cuando algo raro pasa.
app.add_middleware(UnitOfWorkMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFOriginMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
)

register_exception_handlers(app)

# Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
# SEO endpoints at root (no /api prefix) so crawlers find them at canonical URLs
app.include_router(seo_router)


@app.get("/api/health", tags=["ops"], include_in_schema=False)
def health() -> dict:
    from fastapi.responses import JSONResponse

    from app.core.redis_client import redis_is_up
    db_ok = check_db_connection()
    redis_ok = redis_is_up()
    payload = {
        "status": "ok" if db_ok else "degraded",
        "db": "up" if db_ok else "down",
        "redis": "up" if redis_ok else ("disabled" if not settings.REDIS_URL else "down"),
        "version": "1.3.0",
        "environment": settings.ENVIRONMENT,
    }
    if not db_ok:
        return JSONResponse(status_code=503, content=payload)
    return payload
