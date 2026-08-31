"""
Tope de conexiones SSE simultáneas por usuario.

Por qué hace falta un contador y no alcanza con un rate limit: `/api/events`
no es una request, es una request que **no termina**. Limitar cuántas se
abren por minuto no dice nada sobre cuántas hay abiertas ahora, que es lo
único que importa cuando cada una consume un recurso mientras vive.

Y consume uno caro: cada suscriptor abre **su propia conexión a Redis**
(`core/events.py::_suscribir_redis`). O sea que las conexiones SSE se traducen
una a una en conexiones a Redis, contra el `maxclients` del servidor (10.000
por defecto). Un script autenticado que abre streams en un bucle lo agota, y
desde que la blocklist y los rate limits fallan cerrado, quedarse sin Redis
ya no degrada nada en silencio: tira **toda la API** a 503. Es el camino más
corto que hay entre una sola cuenta y el sitio caído.

El estado vive en Redis y no en el proceso porque en producción corren cuatro
workers de uvicorn: un contador por proceso vería una de cada cuatro
conexiones y el tope real sería cuatro veces el configurado, sin que nadie se
entere.

**Cómo se limpia lo que quedó colgado.** Un worker que muere de golpe no
alcanza a descontar sus conexiones. Por eso no se guarda un número sino un
sorted set con una entrada por conexión, con el timestamp del último latido
como score: lo viejo se descarta por fecha en cada consulta. Un contador
plano no tiene cómo distinguir entre "hay ocho conexiones vivas" y "hubo ocho
y el worker se cayó", y se queda trabado en el tope para siempre.
"""

import time
import uuid
from threading import Lock

_KEY_PREFIX = "crow:sse:"


class LimiteDeConexiones:
    def __init__(self, max_por_usuario: int, ttl_segundos: int):
        self.max_por_usuario = max_por_usuario
        # Cuánto vale un latido antes de considerarse abandonado. Tiene que ser
        # bastante más que el intervalo real (25 s) o una conexión sana se
        # daría de baja sola entre latido y latido.
        self.ttl = ttl_segundos

        # Fallback en memoria: user_id -> {token: ultimo_latido}
        self._vivas: dict[int, dict[str, float]] = {}
        self._lock = Lock()

    @classmethod
    def _key(cls, user_id: int) -> str:
        return f"{_KEY_PREFIX}{user_id}"

    def registrar(self, user_id: int) -> str | None:
        """Anota una conexión nueva. Devuelve su token, o None si no hay lugar.

        El chequeo y el alta no son atómicos: entre contar y anotar puede
        entrar otra conexión y quedar una o dos por encima del tope. Se acepta
        a propósito -- esto existe para que no haya diez mil, no para que haya
        exactamente ocho, y un script de Lua para ganar esa precisión sería
        más máquina de la que el problema justifica.
        """
        token = uuid.uuid4().hex
        ahora = time.time()
        corte = ahora - self.ttl

        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("sse_limit.registrar")
        else:
            try:
                key = self._key(user_id)
                r.zremrangebyscore(key, "-inf", corte)
                if r.zcard(key) >= self.max_por_usuario:
                    return None
                r.zadd(key, {token: ahora})
                # Que la clave entera caduque sola: si el usuario no vuelve, no
                # queda un sorted set vacío ocupando lugar para siempre.
                r.expire(key, self.ttl * 2)
                return token
            except Exception as exc:
                sin_redis("sse_limit.registrar", exc)  # si no levanta, sigue en memoria

        with self._lock:
            conexiones = {t: v for t, v in self._vivas.get(user_id, {}).items() if v > corte}
            if len(conexiones) >= self.max_por_usuario:
                self._vivas[user_id] = conexiones
                return None
            conexiones[token] = ahora
            self._vivas[user_id] = conexiones
        return token

    def refrescar(self, user_id: int, token: str) -> None:
        """Marca la conexión como viva. Se llama en cada latido."""
        ahora = time.time()

        from app.core.redis_client import get_redis, sin_redis

        r = get_redis()
        if r is None:
            sin_redis("sse_limit.refrescar")
        else:
            try:
                key = self._key(user_id)
                r.zadd(key, {token: ahora})
                r.expire(key, self.ttl * 2)
                return
            except Exception as exc:
                sin_redis("sse_limit.refrescar", exc)

        with self._lock:
            if user_id in self._vivas:
                self._vivas[user_id][token] = ahora

    def liberar(self, user_id: int, token: str) -> None:
        """Da de baja la conexión. Se llama al cerrar el stream, pase lo que pase.

        Nunca propaga: corre en el `finally` del generador, donde una excepción
        taparía el motivo real por el que se estaba cerrando.
        """
        from app.core.redis_client import get_redis

        r = get_redis()
        if r is not None:
            try:
                r.zrem(self._key(user_id), token)
                return
            except Exception:
                pass  # la entrada caduca sola por TTL

        with self._lock:
            conexiones = self._vivas.get(user_id)
            if conexiones:
                conexiones.pop(token, None)
                if not conexiones:
                    del self._vivas[user_id]

    def activas(self, user_id: int) -> int:
        """Cuántas conexiones vivas tiene ese usuario (tests y diagnóstico)."""
        corte = time.time() - self.ttl

        from app.core.redis_client import get_redis

        r = get_redis()
        if r is not None:
            try:
                key = self._key(user_id)
                r.zremrangebyscore(key, "-inf", corte)
                return int(r.zcard(key))
            except Exception:
                pass

        with self._lock:
            return len([v for v in self._vivas.get(user_id, {}).values() if v > corte])

    def reset_memoria(self) -> None:
        """Vacía el estado en memoria (solo tests)."""
        with self._lock:
            self._vivas.clear()
