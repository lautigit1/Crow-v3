"""
Crow Repuestos API — application entry point.

Startup sequence:
  1. Configure structured JSON logging
  2. Run Alembic migrations (or create_all in development)
  3. Register middleware (order matters — outermost applied first)
  4. Register global exception handlers
  5. Mount API router
  6. Expose /api/health for load-balancer checks
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 — registers models on Base before migrations
from app.api import api_router
from app.core.config import settings
from app.core.database import Base, check_db_connection, engine
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging, get_logger
from app.core.middleware import RequestIDMiddleware, RequestLoggingMiddleware, SecurityHeadersMiddleware

logger = get_logger("crow.startup")


# ---------------------------------------------------------------------------
# Lifespan  (replaces @app.on_event which is deprecated)
# ---------------------------------------------------------------------------

def _wait_for_db(retries: int = 10, delay: float = 2.0) -> None:
    """
    Retry DB connection with exponential backoff.
    Raises RuntimeError if the DB is unreachable after all retries.
    Common in Docker where the app container starts before Postgres is ready.
    """
    import time
    for attempt in range(1, retries + 1):
        if check_db_connection():
            logger.info("Database is reachable", extra={"attempt": attempt})
            return
        wait = delay * (2 ** (attempt - 1))  # 2s, 4s, 8s, 16s…
        logger.warning(
            f"DB not ready (attempt {attempt}/{retries}), retrying in {wait:.0f}s…"
        )
        time.sleep(wait)
    raise RuntimeError(f"Database unreachable after {retries} attempts — aborting startup.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    configure_logging(level="DEBUG" if not settings.is_production else "INFO")
    logger.info(
        "Starting Crow Repuestos API",
        extra={
            "environment": settings.ENVIRONMENT,
            "version": "1.2.0",
            "db_pool_size": settings.DB_POOL_SIZE,
            "access_token_ttl_min": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        },
    )

    # Always wait for DB to be ready (handles Docker startup race conditions)
    _wait_for_db()

    # In development use create_all for convenience; in production use Alembic.
    if not settings.is_production:
        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all — dev mode)")
    else:
        logger.info("Production mode — expecting Alembic migrations to have run")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down — disposing DB connection pool")
    engine.dispose()


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.2.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# ── Middleware (applied in reverse order — last added = outermost) ─────────
# Outermost → innermost:
#   CORS → Security headers → Request ID → Request logging
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ─────────────────────────────────────────────────────
register_exception_handlers(app)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ---------------------------------------------------------------------------
# Health endpoint — intentionally outside the API router so it's always
# reachable even if the router has problems, and excluded from auth.
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["ops"], include_in_schema=False)
def health() -> dict:
    """
    Load-balancer / readiness probe.
    Returns 200 when the app is running and the DB is reachable.
    Returns 503 when the DB is down (so the LB can route around this instance).
    """
    from fastapi import Response
    db_ok = check_db_connection()
    payload = {
        "status": "ok" if db_ok else "degraded",
        "db": "up" if db_ok else "down",
        "version": "1.2.0",
        "environment": settings.ENVIRONMENT,
    }
    if not db_ok:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=payload)
    return payload
