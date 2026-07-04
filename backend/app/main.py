"""
Crow Repuestos API -- application entry point.

Startup sequence:
  1. Configure structured JSON logging
  2. Run Alembic migrations (or create_all in development)
  3. Register middleware (order matters -- outermost applied first)
  4. Register global exception handlers
  5. Mount API router
  6. Expose /api/health for load-balancer checks
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models  # noqa: F401 -- registers models on Base before migrations
from app.api import api_router
from app.api.routes.seo import router as seo_router
from app.core.config import settings
from app.core.database import Base, check_db_connection, engine
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging, get_logger
from app.core.middleware import RequestIDMiddleware, RequestLoggingMiddleware, SecurityHeadersMiddleware

logger = get_logger("crow.startup")


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY == _INSECURE_SECRET:
        raise RuntimeError(
            "SECRET_KEY no está configurada. "
            "Seteá la variable de entorno SECRET_KEY antes de iniciar. "
            "Podés generar una clave segura con: openssl rand -hex 32"
        )

    if settings.is_production and settings.has_insecure_cors:
        raise RuntimeError(
            "BACKEND_CORS_ORIGINS contiene localhost/127.0.0.1 con ENVIRONMENT=production. "
            "Seteá la variable de entorno BACKEND_CORS_ORIGINS con el dominio real "
            "antes de iniciar (ej: https://crowrepuestos.com)."
        )

    configure_logging(level="DEBUG" if not settings.is_production else "INFO")
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

    # Optional Redis — non-fatal if unavailable
    if settings.REDIS_URL:
        from app.core.redis_client import init_redis
        init_redis(settings.REDIS_URL)
    else:
        logger.info("REDIS_URL no configurada — usando stores en memoria")

    import os
    if os.getenv("TESTING"):
        pass  # tables already created by conftest fixture
    elif not settings.is_production:
        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all -- dev mode)")
        # create_all() solo conoce tablas/columnas declaradas en los modelos --
        # no crea extensiones de Postgres. pg_trgm (migracion 003) vive solo
        # en Alembic, asi que en una base nueva en modo dev nunca se instala
        # a menos que la aseguremos aca tambien. Idempotente y no-fatal.
        if engine.dialect.name == "postgresql":
            try:
                with engine.begin() as conn:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                logger.info("pg_trgm extension ensured (dev mode)")
            except Exception as exc:
                logger.warning(f"No se pudo asegurar la extension pg_trgm: {exc}")
    else:
        logger.info("Production mode -- expecting Alembic migrations to have run")

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
# Outermost -> innermost: CORS -> Security headers -> Request ID -> Request logging
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
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
