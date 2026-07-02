# Apply: redis-integration

## Archivos creados

- `app/core/redis_client.py` — singleton `get_redis()` con fallback a `None`

## Archivos modificados

- `app/core/token_blocklist.py` — SETEX/EXISTS en Redis; dict en memoria como fallback
- `app/core/ratelimit.py` — INCR/SETEX/TTL en Redis; defaultdict como fallback
- `app/api/routes/dashboard.py` — cache `GET /analytics` en Redis (TTL 60s)
- `app/core/config.py` — campo `REDIS_URL: str = ""`
- `app/main.py` — `init_redis()` en lifespan; `/health` expone estado Redis
- `requirements.txt` — `redis>=5.0`
- `docker-compose.yml` — servicio `crow_redis` (redis:7-alpine, puerto 6379)
- `.env.example` — documentado `REDIS_URL`
- `backend/.env` — `REDIS_URL=` (vacío, usa fallback en memoria para dev local)

## Desviaciones del plan

Ninguna. El patrón optional funciona correctamente: si `REDIS_URL` está vacío
o Redis no responde, todos los stores siguen funcionando en memoria.
