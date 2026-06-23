from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration — loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Project ───────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "Crow Repuestos API"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"  # development | staging | production

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+psycopg2://crow:crow_dev_password@localhost:5432/crow_repuestos"

    # SQLAlchemy connection pool
    DB_POOL_SIZE: int = 5        # persistent connections kept open
    DB_MAX_OVERFLOW: int = 10    # extra connections allowed under burst
    DB_POOL_TIMEOUT: int = 30    # seconds to wait for a connection
    DB_POOL_RECYCLE: int = 1800  # recycle connections after 30 min (avoids stale TCP)

    # ── Auth / JWT ────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30    # short-lived access token
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60   # how long the refresh token lives

    # ── CORS ──────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ── Seed ──────────────────────────────────────────────────────────────────
    SEED_ADMIN_EMAIL: str = "admin@crowrepuestos.com"
    SEED_ADMIN_PASSWORD: str = "admin1234"
    SEED_USER_EMAIL: str = "cliente@crowrepuestos.com"
    SEED_USER_PASSWORD: str = "cliente1234"

    # ── Rate limiting ─────────────────────────────────────────────────────────
    QUOTE_RATE_LIMIT: int = 5       # max public quote submissions per window
    QUOTE_RATE_WINDOW: int = 3600   # window in seconds (1 hour)

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
