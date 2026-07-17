"""
Optional Redis client — singleton with graceful fallback.

All callers use `get_redis()` and guard with `if r is not None`.
When REDIS_URL is not set or Redis is unreachable, every store falls
back silently to its in-memory implementation.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import redis as _redis_lib

logger = logging.getLogger(__name__)

_client: _redis_lib.Redis | None = None


def init_redis(url: str) -> bool:
    """
    Connect to Redis. Returns True on success.
    On failure, logs a warning and leaves _client as None so callers
    fall back to their in-memory stores.
    """
    global _client
    try:
        import redis

        client: redis.Redis = redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        _client = client
        # Hide password from logs (everything after the last @)
        safe_url = url.rsplit("@", 1)[-1] if "@" in url else url
        logger.info("Redis connected: %s", safe_url)
        return True
    except ImportError:
        logger.warning("redis-py no está instalado — Redis deshabilitado")
        return False
    except Exception as exc:
        logger.warning(
            "Redis no disponible (%s) — usando stores en memoria como fallback", exc
        )
        _client = None
        return False


def get_redis() -> _redis_lib.Redis | None:
    """Return the active Redis client, or None if not connected."""
    return _client


# ---------------------------------------------------------------------------
# Fallback warning (throttled)
# ---------------------------------------------------------------------------
_WARN_EVERY_SECONDS = 60.0
_last_fallback_warn = 0.0


def warn_fallback(store: str, exc: Exception | None = None) -> None:
    """
    Log (throttled a 1/min) que una operación Redis falló y el store cayó a
    su implementación en memoria. Antes esto era un `pass` silencioso: con
    Redis caído y varios workers, la blocklist y los rate limits divergían
    entre procesos sin dejar ningún rastro.

    Solo aplica cuando Redis ESTABA configurado y falló en runtime — el modo
    sin REDIS_URL (dev) no pasa por acá.
    """
    global _last_fallback_warn
    import time

    now = time.time()
    if now - _last_fallback_warn >= _WARN_EVERY_SECONDS:
        _last_fallback_warn = now
        logger.warning(
            "Redis falló en %s (%s) — usando fallback en memoria. "
            "Con múltiples workers este estado no es consistente entre procesos.",
            store,
            exc,
        )


def redis_is_up() -> bool:
    """Quick health probe — returns False if Redis is disabled or unreachable."""
    r = _client
    if r is None:
        return False
    try:
        r.ping()
        return True
    except Exception:
        return False


def close_redis() -> None:
    global _client
    if _client is not None:
        try:
            _client.close()
        except Exception:
            pass
        _client = None
