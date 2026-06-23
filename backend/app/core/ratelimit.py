import time
from collections import defaultdict
from threading import Lock


class LoginRateLimiter:
    """
    Simple in-memory sliding-window limiter for login attempts, keyed by
    IP+email. Good enough for a single-instance deployment; swap for Redis if
    you scale horizontally.
    """

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300, lockout_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window = window_seconds
        self.lockout = lockout_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._locked: dict[str, float] = {}
        self._lock = Lock()

    def _key(self, ip: str | None, email: str) -> str:
        return f"{ip or 'unknown'}:{email.lower()}"

    def check(self, ip: str | None, email: str) -> float | None:
        """Returns remaining lockout seconds if currently locked, else None."""
        key = self._key(ip, email)
        now = time.time()
        with self._lock:
            until = self._locked.get(key)
            if until and until > now:
                return round(until - now)
            if until:
                self._locked.pop(key, None)
        return None

    def register_failure(self, ip: str | None, email: str) -> None:
        key = self._key(ip, email)
        now = time.time()
        with self._lock:
            hits = [t for t in self._hits[key] if now - t < self.window]
            hits.append(now)
            self._hits[key] = hits
            if len(hits) >= self.max_attempts:
                self._locked[key] = now + self.lockout
                self._hits[key] = []

    def reset(self, ip: str | None, email: str) -> None:
        key = self._key(ip, email)
        with self._lock:
            self._hits.pop(key, None)
            self._locked.pop(key, None)


login_limiter = LoginRateLimiter()
