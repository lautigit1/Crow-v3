# Apply: nginx-dynamic-dns-uvicorn-workers

## Resumen

`frontend/nginx.conf` ahora resuelve el hostname `api` en runtime (DNS embebido de Docker + TTL corto) en vez de cachear la IP para siempre, y `backend/Dockerfile` arranca uvicorn con múltiples workers (configurable vía `UVICORN_WORKERS`, sin rebuild). Hallazgo "Alta" #15 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `frontend/nginx.conf`
- `backend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.env.example`

## Decisiones documentadas

- El fix de nginx requiere una variable en `proxy_pass` (no solo la directiva `resolver`) porque nginx solo re-resuelve hostnames en runtime cuando el destino de `proxy_pass` es una variable, no un literal.
- `UVICORN_WORKERS` se agregó como env var configurable en vez de un número fijo en el Dockerfile, para poder ajustarlo por servidor sin rebuildear la imagen.
- Se verificó antes de tocar el Dockerfile que Redis (blocklist/rate limiting) y pgbouncer (pool de conexiones) ya estaban preparados de antes para correr múltiples workers -- el cambio no introduce nuevo riesgo de estado no compartido entre procesos, solo activa un flag que el resto del stack ya esperaba.
- Defaults distintos por entorno: 2 en dev (liviano para desarrollo local), 4 en prod (punto de partida ajustable).

## Verificación

- `python3 -c "import yaml; yaml.safe_load(...)"` sobre `docker-compose.yml` y `docker-compose.prod.yml` -- ambos válidos.
- `sh -n` sobre el `CMD` completo del Dockerfile (con la sustitución `${UVICORN_WORKERS:-2}` incluida) -- sintaxis válida.
- Revisión manual de la sintaxis de nginx (`resolver`/`set`/`proxy_pass` con variable) contra el patrón oficial documentado para este problema en Docker.
- No aplica a la suite de pytest/vitest: el cambio es puramente de infraestructura (Dockerfile, nginx.conf, YAML de compose), no toca código Python ni TypeScript.

## Pendiente / limitaciones

- **No se pudo levantar el stack real con Docker en este entorno** (sin daemon de Docker en el sandbox de esta sesión, limitación conocida). La confirmación end-to-end de ambos cambios (nginx sigue sirviendo tras recrear `api` con una IP nueva; `docker compose top api` muestra 4 procesos uvicorn) queda pendiente para el primer deploy real donde haya Docker disponible.
- El valor de `UVICORN_WORKERS=4` en producción es un punto de partida razonable, no una medición real contra hardware específico -- debería ajustarse según los cores del servidor final una vez conocido.
