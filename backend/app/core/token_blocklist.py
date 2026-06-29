"""
JWT revocation blocklist — Redis-backed with in-memory fallback.

When Redis is available:
  block()      →  SETEX crow:bl:{jti} {ttl} "1"
  is_blocked() →  EXISTS crow:bl:{jti}

When Redis is not configured or unreachable, falls back to an in-memory
dict protected by a threading.Lock. Tokens re-become valid after a restart
in that case (worst-case window = ACCESS_TOKEN_EXPIRE_MINUTES).
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
        from app.core.redis_client import get_redis

        r = get_redis()
        if r is not None:
            ttl = max(1, int(expires_at - time.time()))
            try:
                r.setex(f"{_KEY_PREFIX}{jti}", ttl, "1")
                return
            except Exception:
                pass  # Redis error — fall through to in-memory

        with self._lock:
            self._entries[jti] = expires_at
            self._sweep_unlocked()

    def is_blocked(self, jti: str) -> bool:
        """Return True if the JTI has been revoked and the token hasn't expired."""
        from app.core.redis_client import get_redis

        r = get_redis()
        if r is not None:
            try:
                return bool(r.exists(f"{_KEY_PREFIX}{jti}"))
            except Exception:
                pass  # Redis error — fall through to in-memory

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
            return len(sel