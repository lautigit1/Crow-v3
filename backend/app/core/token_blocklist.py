"""
In-memory JWT revocation blocklist, keyed by JTI (JWT ID).

Every access token carries a unique `jti` claim. On logout (or forced
revocation), the JTI is stored here until the token's natural expiry, after
which it's cleaned up lazily or by a periodic sweep.

Trade-offs vs. Redis:
  ✓ No extra infrastructure
  ✓ Zero-latency lookups
  ✗ State is lost on restart (tokens re-become valid — acceptable for 30-min
    windows; worst case window equals ACCESS_TOKEN_EXPIRE_MINUTES)
  ✗ Not shared across multiple instances — use Redis if you scale horizontally

For horizontal scaling, swap the body of `block` / `is_blocked` for Redis
SETEX / EXISTS calls without changing any caller code.
"""

import time
from threading import Lock


class TokenBlocklist:
    def __init__(self) -> None:
        # jti → unix timestamp of token expiry
        self._entries: dict[str, float] = {}
        self._lock = Lock()

    def block(self, jti: str, expires_at: float) -> None:
        """Add a JTI to the blocklist. expires_at is a POSIX timestamp."""
        with self._lock:
            self._entries[jti] = expires_at
            self._sweep_unlocked()

    def is_blocked(self, jti: str) -> bool:
        """Return True if the JTI has been revoked and the token hasn't expired yet."""
        now = time.time()
        with self._lock:
            exp = self._entries.get(jti)
            if exp is None:
                return False
            if exp < now:
                # Token already expired naturally — clean up and let it through
                # (expired tokens are rejected by JWT decode anyway)
                del self._entries[jti]
                return False
            return True

    def _sweep_unlocked(self) -> None:
        """Remove all expired entries. Must be called while holding self._lock."""
        now = time.time()
        expired = [jti for jti, exp in self._entries.items() if exp < now]
        for jti in expired:
            del self._entries[jti]

    def size(self) -> int:
        """Number of currently blocked tokens (for monitoring)."""
        with self._lock:
            return len(self._entries)


# Singleton — imported by deps.py and auth routes
token_blocklist = TokenBlocklist()
