# Proposal: ops-infra-hardening

## What

Corregir las 4 debilidades de operación e infraestructura de la auditoría del 2026-07-10: configuración frágil de `TRUSTED_PROXIES`, ausencia de stack de producción (secretos hardcodeados, sin TLS, sin migraciones en el arranque), degradación silenciosa cuando Redis falla, y sesiones que expiran a la hora.

## Why

- **`TRUSTED_PROXIES` frágil:** hoy exige la IP exacta del contenedor nginx, que cambia si el contenedor se recrea. Sin ella, todas las requests aparecen con la IP de nginx: audit logs inútiles y rate limiting agrupando a todos los usuarios en una sola clave.
- **Solo stack de desarrollo:** password de Postgres hardcodeada (`crow_dev_password`), API publicada en el puerto 8000 del host, Redis sin contraseña, sin TLS, y el arranque depende de `seed.py` + `reconcile()` en vez de `alembic upgrade head` — las migraciones existen pero nada las ejecuta.
- **Fallback en memoria silencioso:** si Redis se cae en runtime, blocklist y rate limiters pasan a memoria por proceso sin ninguna señal — con más de un worker, la revocación de tokens deja de ser consistente y nadie se entera.
- **Refresh token de 60 min:** un usuario inactivo ~1 h pierde la sesión; agresivo para un e-commerce, y ya no es necesario: con rotación one-time-use, revocación por jti y `token_version`, extender la vida del refresh no amplía la superficie de ataque de forma significativa.

## Non-goals

- No se cambia el flujo de desarrollo (`docker compose up` sigue funcionando igual, con defaults dev).
- No se agrega monitoring/alerting externo (Prometheus, Sentry) — queda para otro change.
- No se toca `backend/docker-compose.yml` (compose legacy de backend solo, ya cubierto por `critical-fixes`).
- No se purga el historial de git ni se resuelve la higiene del repo (ítems 11–12 de la auditoría).

## Success criteria

- `TRUSTED_PROXIES` acepta CIDRs; el compose define una subnet fija y la usa por defecto — recrear contenedores no rompe la detección de IP real.
- Existe `docker-compose.prod.yml`: sin puertos internos publicados, Postgres y Redis con password obligatoria vía env, TLS automático (Caddy + Let's Encrypt) delante del sitio, `alembic upgrade head` en el arranque del API, y `ENVIRONMENT=production`.
- En producción el API no arranca sin `REDIS_URL` (fail-fast, mismo criterio que `SECRET_KEY`/CORS); si Redis se cae en runtime, se loguea un warning (throttled) en cada fallback.
- El refresh token dura 7 días por defecto; la sesión sobrevive períodos de inactividad razonables.
- `DEPLOY.md` documenta el procedimiento de deploy completo.
