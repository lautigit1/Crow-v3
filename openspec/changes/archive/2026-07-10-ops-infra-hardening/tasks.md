# Tasks: ops-infra-hardening

## Implementation tasks

- [x] **T1a** — `config.py`: property `trusted_proxy_networks` (CIDRs + IPs sueltas vía `ipaddress`); se eliminó `trusted_proxy_set`
- [x] **T1b** — `audit.client_ip()`: matcheo del peer contra las redes confiables (`_peer_is_trusted_proxy`)
- [x] **T1c** — `docker-compose.yml`: red `crow_net` con subnet fija `172.28.0.0/16`; `TRUSTED_PROXIES` default a la subnet
- [x] **T2a** — `docker-compose.yml` (dev): `POSTGRES_PASSWORD` por env con default dev
- [x] **T2b** — `docker-compose.prod.yml` nuevo: passwords obligatorias (`:?`), sin puertos internos, Redis con `--requirepass` + AOF, `ENVIRONMENT=production`
- [x] **T2c** — `deploy/Caddyfile`: TLS automático (Let's Encrypt) delante de `web`
- [x] **T2d** — `backend/Dockerfile`: `alembic upgrade head` en el arranque cuando `ENVIRONMENT=production`
- [x] **T2e** — `seed.py`: no crear el producto demo en producción
- [x] **T2f** — Healthcheck del servicio `api` en ambos compose (urllib contra `/api/health`; `web` espera `service_healthy`)
- [x] **T2g** — `DEPLOY.md`: procedimiento de deploy documentado (primer deploy, updates, backups, troubleshooting)
- [x] **T2h** — `.env.example`: variables nuevas (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `DOMAIN`, SMTP, Cloudinary)
- [x] **T3a** — `main.py`: fail-fast si `ENVIRONMENT=production` y `REDIS_URL` vacía; warning si `TRUSTED_PROXIES` vacía en prod
- [x] **T3b** — `redis_client.py`: helper `warn_fallback()` con throttle de 60 s
- [x] **T3c** — `ratelimit.py` (check/register_failure/reset) y `token_blocklist.py` (block/is_blocked): loguear el fallback en cada error de Redis
- [x] **T4** — `config.py`: `REFRESH_TOKEN_EXPIRE_MINUTES` default 10080 (7 días)
- [ ] **T5** — Verificación: archivos releídos tras escribirse — PENDIENTE al
      archivar (2026-07-10, sandbox sin shell): correr en la máquina del
      usuario `cd backend && pytest` y
      `docker compose -f docker-compose.prod.yml config --quiet`
