"""
JWT revocation blocklist — Redis-backed with in-memory fallback.

When Redis is available:
  block()      →  SETEX crow:bl:{jti} {ttl} "1"
  is_blocked() →  EXISTS crow:bl:{jti}

Fuera de producción (o en un deploy sin `REDIS_URL` a propósito) cae a un
dict en memoria protegido por un `threading.Lock`; los tokens vuelven a ser
válidos tras un reinicio, con una ventana máxima de
ACCESS_TOKEN_EXPIRE_MINUTES.

En producción con `REDIS_URL` configurada NO hay fallback: si Redis no
responde, `sin_redis()` levanta `RedisCaido` (→ 503). El store en memoria
arranca vacío, así que caer ahí resucitaría cada token revocado en logout y
cada refresh ya rotado -- ver el docstring de `core/redis_client.sin_redis`.
"""

import time
from threading import Lock

_KEY_PREFIX = "crow:bl:"


class TokenBlocklist:
    def __init__(self) -> None:
        # In-memory fallback store: jti → unix expiry timestamp
        self._entries: dict[str, float] = {}
        self._lock = Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def block(self, jti: str, expires_at: float) -> None:
        """Revoke a token by JTI. expires_at is a POSIX timestamp."""
        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("token_blocklist.block")
        else:
            ttl = max(1, int(expires_at - time.time()))
            try:
                r.setex(f"{_KEY_PREFIX}{jti}", ttl, "1")
                return
            except Exception as exc:
                sin_redis("token_blocklist.block", exc)  # si no levanta, sigue en memoria

        with self._lock:
            self._entries[jti] = expires_at
            self._sweep_unlocked()

    def is_blocked(self, jti: str) -> bool:
        """Return True if the JTI has been revoked and the token hasn't expired."""
        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("token_blocklist.is_blocked")
        else:
            try:
                return bool(r.exists(f"{_KEY_PREFIX}{jti}"))
            except Exception as exc:
                sin_redis("token_blocklist.is_blocked", exc)  # si no levanta, sigue en memoria

        now = time.time()
        with self._lock:
            exp = self._entries.get(jti)
            if exp is None:
                return False
            if exp < now:
                del self._entries[jti]
                return False
            return True

    def size(self) -> int:
        """Number of blocked tokens in the in-memory store (monitoring only)."""
        with self._lock:
            return len(self._entries)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _sweep_unlocked(self) -> None:
        """Evict expired entries. Must be called while holding self._lock."""
        now = time.time()
        expired = [jti for jti, exp in self._entries.items() if exp < now]
        for jti in expired:
            del self._entries[jti]


# Singleton — imported by deps.py and auth routes
token_blocklist = TokenBlocklist()
