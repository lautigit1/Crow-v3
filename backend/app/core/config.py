import ipaddress
import logging
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_logger = logging.getLogger("crow.config")


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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30      # short-lived access token
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 días — el refresh es one-time-use
    # (rotación + blocklist), revocable en logout e invalidable en masa por
    # token_version, así que una vida larga no amplía la superficie de ataque.

    # ── CORS ──────────────────────────────────────────────────────────────────
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ── Seed ──────────────────────────────────────────────────────────────────
    SEED_ADMIN_EMAIL: str = "admin@crowrepuestos.com"
    SEED_ADMIN_PASSWORD: str = "admin1234"
    SEED_USER_EMAIL: str = "cliente@crowrepuestos.com"
    SEED_USER_PASSWORD: str = "cliente1234"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = ""
    # Connection URL for Redis. Leave empty to use in-memory fallback stores.
    # Example: "redis://localhost:6379/0"  or  "redis://:password@redis:6379/0"

    # ── Security / Proxy ─────────────────────────────────────────────────────
    TRUSTED_PROXIES: str = ""
    # Comma-separated IPs or CIDR ranges of trusted reverse proxies.
    # Examples: "172.18.0.3", "172.28.0.0/16", "10.0.0.1,172.28.0.0/16"
    # The docker-compose stack pins its network to 172.28.0.0/16 and passes
    # that subnet by default, so container recreation never breaks this.
    # Leave empty in local dev — X-Forwarded-For is ignored when list is empty.

    # ── Rate limiting ─────────────────────────────────────────────────────────
    QUOTE_RATE_LIMIT: int = 5       # max public quote submissions per window
    QUOTE_RATE_WINDOW: int = 3600   # window in seconds (1 hour)

    # ── Media uploads (Cloudinary) ───────────────────────────────────────────
    # Dejar vacío para deshabilitar el upload de imágenes (el form admin cae
    # al campo de URL manual). Conseguí las credenciales en cloudinary.com.
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""            # e.g. ventas@crowrepuestos.com.ar
    SMTP_PASSWORD: str = ""        # app password (Gmail) or SMTP password
    SMTP_FROM: str = "Crow Repuestos <noreply@crowrepuestos.com.ar>"
    ADMIN_EMAIL: str = "ventas@crowrepuestos.com.ar"
    FRONTEND_URL: str = "http://localhost:5173"   # override in production
    RESET_TOKEN_EXPIRE_MINUTES: int = 60

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def has_insecure_cors(self) -> bool:
        """True if any configured CORS origin still points to localhost/127.0.0.1.

        Used to fail fast on startup when ENVIRONMENT=production but nobody
        overrode BACKEND_CORS_ORIGINS from its development default.
        """
        markers = ("localhost", "127.0.0.1")
        return any(marker in origin for origin in self.cors_origins for marker in markers)

    @property
    def trusted_proxy_networks(self) -> tuple["ipaddress.IPv4Network | ipaddress.IPv6Network", ...]:
        """Parsed TRUSTED_PROXIES entries. Accepts single IPs (→ /32) and CIDRs.
        Invalid entries are skipped with a warning instead of crashing startup."""
        networks = []
        for raw in self.TRUSTED_PROXIES.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                networks.append(ipaddress.ip_network(raw, strict=False))
            except ValueError:
                _logger.warning("TRUSTED_PROXIES: entrada inválida ignorada: %r", raw)
        return tuple(networks)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cloudinary_configured(self) -> bool:
        return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
