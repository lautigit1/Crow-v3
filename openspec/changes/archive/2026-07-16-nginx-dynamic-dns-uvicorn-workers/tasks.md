# Tasks: nginx-dynamic-dns-uvicorn-workers

- [x] **T1** — Leer `frontend/nginx.conf` para identificar los `proxy_pass` con hostname literal
- [x] **T2** — Agregar `resolver 127.0.0.11 valid=30s;` + `set $upstream_api http://api:8000;` al bloque `server`
- [x] **T3** — Cambiar los 2 `proxy_pass` (`/api/` y `sitemap.xml`/`robots.txt`) para usar `$upstream_api`
- [x] **T4** — Leer `backend/Dockerfile` y confirmar que uvicorn corría con un único proceso
- [x] **T5** — Verificar que el resto del stack ya soporta multi-worker: `app/main.py` exige Redis en producción por consistencia entre workers; `docker-compose.prod.yml` ya corre pgbouncer anticipando este cambio
- [x] **T6** — Agregar `--workers ${UVICORN_WORKERS:-2}` al `CMD` del Dockerfile, con comentario explicando la relación con Redis/pgbouncer
- [x] **T7** — Agregar `UVICORN_WORKERS: ${UVICORN_WORKERS:-2}` a `docker-compose.yml` (dev)
- [x] **T8** — Agregar `UVICORN_WORKERS: ${UVICORN_WORKERS:-4}` a `docker-compose.prod.yml`
- [x] **T9** — Documentar `UVICORN_WORKERS` en `.env.example`
- [x] **T10** — Verificar YAML válido de ambos compose (`python3 -c "import yaml; yaml.safe_load(...)"`)
- [x] **T11** — Verificar sintaxis de shell del `CMD` completo del Dockerfile (`sh -n`)
