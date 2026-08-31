"""
Rate limiters — Redis-backed con fallback en memoria.

Dos formas, para dos problemas distintos:

  * `LoginRateLimiter` — con **lockout**: al llegar al tope, la clave queda
    bloqueada `lockout_seconds` aunque deje de haber intentos. Es lo que
    corresponde en credenciales (login, registro, reset, cotizaciones): el
    costo de frenar de más a alguien que erró la contraseña cinco veces es
    bajo, y el de dejar seguir probando es alto.

  * `IPRateLimiter` — ventana simple, **sin lockout**: cuenta y deja pasar de
    nuevo apenas la ventana corre. Es lo que corresponde en el tráfico normal
    de la API, donde el tope existe contra el scraping y el abuso, y trabar
    quince minutos a un negocio entero detrás de un NAT porque hubo un pico
    sería peor que el problema que resuelve.

Redis key schema:
  crow:rl:lock:{ip}:{email}   →  SETEX {lockout_seconds} "1"   (lockout activo)
  crow:rl:cnt:{ip}:{email}    →  INCR + EXPIRE {window}        (contador)
  crow:rl:ip:{bucket}:{ip}    →  INCR + EXPIRE {window}        (IPRateLimiter)

Fuera de producción (o en un deploy sin `REDIS_URL` a propósito) cae a una
implementación en memoria: se pierde al reiniciar y no se comparte entre
instancias.

En producción con `REDIS_URL` configurada NO hay fallback: `sin_redis()`
levanta `RedisCaido` (→ 503). Los contadores en memoria arrancan en cero, así
que caer ahí es poner todos los límites de vuelta a foja cero justo cuando el
sistema está peor -- ver el docstring de `core/redis_client.sin_redis`.
"""

import time
from collections import defaultdict
from threading import Lock

_LOCK_PREFIX = "crow:rl:lock:"
_CNT_PREFIX = "crow:rl:cnt:"
_IP_PREFIX = "crow:rl:ip:"


class LoginRateLimiter:
    # Registry of every limiter instance — lets the test suite wipe in-memory
    # state between tests (see reset_all_memory_state).
    _instances: list["LoginRateLimiter"] = []

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
        LoginRateLimiter._instances.append(self)

    @classmethod
    def reset_all_memory_state(cls) -> None:
        """Clear the in-memory state of every limiter (testing only)."""
        for limiter in cls._instances:
            with limiter._lock:
                limiter._hits.clear()
                limiter._locked.clear()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check(self, ip: str | None, email: str) -> float | None:
        """Return remaining lockout seconds if the key is locked, else None."""
        key = self._key(ip, email)
        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("ratelimit.check")
        else:
            try:
                ttl = r.ttl(f"{_LOCK_PREFIX}{key}")
                return float(ttl) if ttl > 0 else None
            except Exception as exc:
                sin_redis("ratelimit.check", exc)  # si no levanta, sigue en memoria

        now = time.time()
        with self._lock:
            until = self._locked.get(key)
            if until and until > now:
                return round(until - now)
            if until:
                self._locked.pop(key, None)
        return None

    def register_failure(self, ip: str | None, email: str) -> None:
        """Record a failed attempt. Triggers lockout when max_attempts is reached."""
        key = self._key(ip, email)
        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("ratelimit.register_failure")
        else:
            try:
                cnt_key = f"{_CNT_PREFIX}{key}"
                lock_key = f"{_LOCK_PREFIX}{key}"
                count = r.incr(cnt_key)
                if count == 1:
                    # First hit — start the window TTL
                    r.expire(cnt_key, self.window)
                if count >= self.max_attempts:
                    r.setex(lock_key, self.lockout, "1")
                    r.delete(cnt_key)
                return
            except Exception as exc:
                sin_redis("ratelimit.register_failure", exc)  # si no levanta, sigue en memoria

        now = time.time()
        with self._lock:
            hits = [t for t in self._hits[key] if now - t < self.window]
            hits.append(now)
            self._hits[key] = hits
            if len(hits) >= self.max_attempts:
                self._locked[key] = now + self.lockout
                self._hits[key] = []

    def reset(self, ip: str | None, email: str) -> None:
        """Clear all rate-limit state for this key (e.g. after successful login)."""
        key = self._key(ip, email)
        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("ratelimit.reset")
        else:
            try:
                r.delete(f"{_CNT_PREFIX}{key}", f"{_LOCK_PREFIX}{key}")
                return
            except Exception as exc:
                sin_redis("ratelimit.reset", exc)  # si no levanta, sigue en memoria

        with self._lock:
            self._hits.pop(key, None)
            self._locked.pop(key, None)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _key(self, ip: str | None, email: str) -> str:
        return f"{ip or 'unknown'}:{email.lower()}"


login_limiter = LoginRateLimiter()


class IPRateLimiter:
    """Tope general de requests por IP, en ventana fija y sin lockout.

    El backstop de aplicación que faltaba: hasta acá, todo lo que no fuera
    login/registro/reset/cotización solo tenía el `limit_req` de nginx. Eso
    cubre el caso en que nginx está adelante y ve la IP real, y no cubre nada
    más: el API expuesto directo (otro proxy, un port-forward, un compose
    distinto) quedaba sin ningún tope, y 20 r/s por IP igual alcanzan para
    barrer el catálogo entero o enumerar IDs con paciencia.

    Ventana fija y no deslizante a propósito: con Redis es un `INCR` + un
    `EXPIRE`, dos comandos por request y nada de estado por cliente. El costo
    conocido de la ventana fija es que en el borde entre dos ventanas pasa
    hasta el doble del tope; para un backstop contra abuso eso es irrelevante,
    y no justifica el sorted-set por IP que costaría la versión deslizante.

    `retry_after()` devuelve los segundos que faltan para que la ventana
    corra, o None si todavía hay lugar.
    """

    _instances: list["IPRateLimiter"] = []

    def __init__(self, nombre: str, max_requests: int, window_seconds: int):
        self.nombre = nombre
        self.max_requests = max_requests
        self.window = window_seconds

        # Fallback en memoria: ip -> (fin_de_ventana, cantidad)
        self._counts: dict[str, tuple[float, int]] = {}
        self._lock = Lock()
        IPRateLimiter._instances.append(self)

    @classmethod
    def reset_all_memory_state(cls) -> None:
        """Vacía el estado en memoria de todas las instancias (solo tests)."""
        for limiter in cls._instances:
            with limiter._lock:
                limiter._counts.clear()

    def retry_after(self, ip: str | None) -> int | None:
        """Cuenta esta request. Devuelve los segundos a esperar si excede el tope."""
        key = f"{self.nombre}:{ip or 'unknown'}"
        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("ratelimit.ip")
        else:
            try:
                redis_key = f"{_IP_PREFIX}{key}"
                count = r.incr(redis_key)
                if count == 1:
                    r.expire(redis_key, self.window)
                if count > self.max_requests:
                    # `ttl` puede volver -1 si la clave quedó sin expiración
                    # por una carrera entre el INCR y el EXPIRE; en ese caso se
                    # reporta la ventana entera, que es el peor caso honesto.
                    ttl = r.ttl(redis_key)
                    return ttl if ttl > 0 else self.window
                return None
            except Exception as exc:
                sin_redis("ratelimit.ip", exc)  # si no levanta, sigue en memoria

        now = time.time()
        with self._lock:
            fin, count = self._counts.get(key, (0.0, 0))
            if fin <= now:
                fin, count = now + self.window, 0
            count += 1
            self._counts[key] = (fin, count)
            if count > self.max_requests:
                return max(1, int(fin - now))
        return None
