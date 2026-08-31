"""
Cache de respuestas en Redis, con degradación silenciosa.

A diferencia de la blocklist y los rate limits, que fallan CERRADO (ver
`core/redis_client.sin_redis`), acá el fallback correcto es no cachear: un
cache que no responde significa recalcular, que es exactamente lo que pasaba
antes de que existiera el cache. Nada se rompe, solo se hace más lento. Por
eso estas funciones se tragan las excepciones en vez de propagarlas.

Vivía como un par de helpers privados dentro de `routes/dashboard.py` hasta
que el sitemap necesitó lo mismo. Está acá para que haya una sola
implementación y no dos que se van separando de a poco.
"""

import logging

logger = logging.getLogger(__name__)

_PREFIJO = "crow:cache:"


def cache_get(key: str) -> str | None:
    """Devuelve el valor cacheado, o None si no está / no hay Redis / falló."""
    from app.core.redis_client import get_redis

    r = get_redis()
    if r is None:
        return None
    try:
        return r.get(f"{_PREFIJO}{key}")
    except Exception:
        return None


def cache_set(key: str, value: str, ttl: int) -> None:
    """Guarda con TTL. No falla nunca: no poder cachear no es un error."""
    from app.core.redis_client import get_redis

    r = get_redis()
    if r is None:
        return
    try:
        r.setex(f"{_PREFIJO}{key}", ttl, value)
    except Exception:
        pass


def cache_delete(*keys: str) -> None:
    """Invalida una o más entradas."""
    from app.core.redis_client import get_redis

    r = get_redis()
    if r is None or not keys:
        return
    try:
        r.delete(*[f"{_PREFIJO}{k}" for k in keys])
    except Exception:
        pass
