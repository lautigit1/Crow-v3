# Design: redis-integration

## Patrón: optional Redis con fallback a memoria

```python
# redis_client.py
def get_redis() -> Redis | None:
    """Retorna cliente Redis o None si REDIS_URL está vacío."""
```

Todos los callers hacen `if r is not None:` antes de usar Redis.
Si Redis no está disponible, el sistema usa las implementaciones en memoria existentes.

## Archivos modificados

### `app/core/redis_client.py` (nuevo)
- Singleton `_redis: Redis | None`
- `init_redis()` llamado en lifespan de FastAPI
- `get_redis()` retorna la instancia o `None`

### `app/core/token_blocklist.py`
- Antes: `dict[str, float]` + `threading.Lock`
- Después: `SETEX(jti, ttl, 1)` + `EXISTS(jti)` si Redis disponible; fallback a dict

### `app/core/ratelimit.py`
- Antes: `defaultdict(list)` + `Lock`
- Después: `INCR(key)` + `SETEX(key, window, 1)` + `TTL(key)` si Redis; fallback a defaultdict

### `app/api/routes/dashboard.py`
- Cache `GET /analytics` en Redis con TTL 60s
- Key: `dashboard:analytics`
- Si Redis no disponible: calcula siempre (comportamiento anterior)

### `app/core/config.py`
```python
REDIS_URL: str = ""  # vacío = usar fallback en memoria
```

### `app/main.py`
- `lifespan`: llama `await init_redis()` al arrancar
- `/health`: incluye `"redis": "ok" | "unavailable"`

### `docker-compose.yml`
```yaml
redis:
  image: redis:7-alpine
  container_name: crow_redis
  ports: ["6379:6379"]
```

### `requirements.txt`
```
redis>=5.0
```
