"""
Login / registration rate limiter — Redis-backed with in-memory fallback.

Redis key schema:
  crow:rl:lock:{ip}:{email}   →  SETEX {lockout_seconds} "1"   (lockout active)
  crow:rl:cnt:{ip}:{email}    →  INCR with EXPIRE {window}      (hit counter)

When Redis is not configured or unreachable, falls back to in-memory
sliding-window implementation (resets on restart, not shared across instances).
"""

import time
from collections import defaultdict
from threading import Lock

_LOCK_PREFIX = "crow:rl:lock:"
_CNT_PREFIX = "crow:rl:cnt:"


class LoginRateLimiter:
    def __init__(
        self,
        max_attempts: int = 5,
        window_seconds: int = 300,
        lockout_seconds: int = 300,
    ):
        self.max_attempts = max_attempts
        self.window = window_seconds
        self.lockout = lockout_seconds

        # In-memory fallback state
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._locked: dict[str, float] = {}
        self._lock = Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check(self, ip: str | None, email: str) -> float | None:
        """Return remaining lockout seconds if the key is locked, else None."""
        key = self._key(ip, email)
        from app.core.redis_client import get_redis

        r = get_redis()
        if r is not None:
            try:
                ttl = r.ttl(f"{_LOCK_PREFIX}{key}")
                return float(ttl) if ttl > 0 else None
            except Exception:
                pass  # fall through

        now = time.time()
        with self._lock:
            until = self._locked.get(key)
            if until and until > now:
                return round(until - now)
            if until:
                self.