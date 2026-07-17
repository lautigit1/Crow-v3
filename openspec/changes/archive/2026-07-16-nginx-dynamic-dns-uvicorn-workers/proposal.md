# Proposal: nginx-dynamic-dns-uvicorn-workers

## What

Hallazgo "Alta" #15 de la auditoría técnica del 2026-07-13, dos problemas relacionados de infraestructura:

1. `frontend/nginx.conf` usaba `proxy_pass http://api:8000/...` con el hostname literal -- nginx resuelve ese DNS una sola vez al arrancar y cachea la IP para siempre, sin volver a consultarla.
2. `backend/Dockerfile` arrancaba uvicorn con un único proceso (sin `--workers`), dejando sin usar cualquier core de CPU adicional del servidor y convirtiendo a ese proceso en un punto único de caída.

## Why

**nginx**: en Docker, el contenedor `api` puede recrearse (deploy, `docker compose up -d --build api`, un restart por el healthcheck) y recibir una IP nueva de la red interna. Con el hostname cacheado, nginx sigue mandando tráfico a la IP vieja -- el contenedor viejo ya no existe, así que cada request a `/api/*` devuelve 502 hasta que alguien nota el problema y reinicia `nginx` manualmente. Es un modo de fallo silencioso que aparece justo después de cada deploy del backend, el peor momento para descubrirlo.

**uvicorn --workers**: un solo proceso Python (GIL de por medio) no aprovecha más de un core, y si ese proceso se cuelga o queda en un estado raro, todo el API deja de responder hasta que el healthcheck lo reinicie (con el downtime que eso implica). El resto del stack ya estaba preparado para correr múltiples workers sin cambios: `app/main.py` (`lifespan()`) ya exige `REDIS_URL` en producción específicamente para que la blocklist de tokens y el rate limiting sean consistentes *entre workers*, y `docker-compose.prod.yml` ya corre `pgbouncer` justo para que el pool de conexiones de SQLAlemy multiplicado por N workers no golpee a Postgres directamente. Faltaba solamente el flag.

## Non-goals

- No se migró a un balanceador de mayor nivel (Docker Swarm, Kubernetes, múltiples réplicas del contenedor `api`) -- eso es un cambio de arquitectura de despliegue mucho más grande. `--workers N` dentro de un único contenedor es la mejora incremental que corresponde a este hallazgo puntual.
- No se pudo levantar el stack real con Docker en este entorno (sin daemon de Docker en el sandbox de verificación, limitación conocida ya documentada en cambios anteriores de esta sesión) -- se verificó todo lo que es verificable sin Docker (sintaxis YAML, sintaxis de shell del `CMD`, revisión manual de la sintaxis de nginx contra la documentación oficial del patrón `resolver` + variable).

## Success criteria

- `frontend/nginx.conf` resuelve el hostname `api` en runtime (no solo al arrancar), usando el DNS embebido de Docker (`127.0.0.11`) con un TTL corto, de forma que un contenedor `api` recreado con IP nueva se descubre solo, sin reiniciar nginx.
- `backend/Dockerfile` arranca uvicorn con `--workers`, configurable vía la variable de entorno `UVICORN_WORKERS` sin necesidad de rebuildear la imagen.
- `docker-compose.yml` (dev) y `docker-compose.prod.yml` fijan un default explícito (`2` en dev, `4` en prod) y documentan cómo ajustarlo.
- `.env.example` documenta la variable nueva.
- Ningún test de Python se ve afectado (el cambio es puramente de infraestructura, no toca código de la app).
