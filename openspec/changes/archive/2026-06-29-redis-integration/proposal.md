# Proposal: redis-integration

## Problema
Los tres stores en memoria (`TokenBlocklist`, `LoginRateLimiter`, dashboard cache) son volátiles:
- Los tokens bloqueados vuelven a ser válidos tras un reinicio.
- Los contadores de rate limit se resetean en cada deploy.
- El cache del dashboard no existe en el servidor — solo Cache-Control del browser.

## Solución
Integrar Redis como backend opcional (con fallback a memoria). Si `REDIS_URL` no está seteada, el sistema sigue funcionando exactamente igual que antes.

## Cambios
- `app/core/redis_client.py` — cliente singleton con init/fallback
- `app/core/token_blocklist.py` — SETEX/EXISTS en lugar de dict+Lock
- `app/core/ratelimit.py` — INCR/SETEX/TTL en lugar de defaultdict+Lock
- `app/api/routes/dashboard.py` — cache GET en Redis con TTL 60s
- `app/core/config.py` — agregar `REDIS_URL`
- `app/main.py` — init Redis en lifespan, exponer redis en /health
- `requirements.txt` — `redis>=5.0`
- `docker-compose.yml` — servicio `redis:7-alpine`
- `.env.example` — documentar `REDIS_URL`
