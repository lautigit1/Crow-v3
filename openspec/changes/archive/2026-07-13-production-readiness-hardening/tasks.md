# Tasks: production-readiness-hardening

## Fix 1 — Backups de Postgres

- [x] **T1** — `deploy/backup-postgres.sh` (pg_dump + gzip + timestamp + retención configurable)
- [x] **T2** — `deploy/restore-postgres.sh` (con confirmación explícita)
- [x] **T3** — Verificación funcional con `docker` stub: backup exitoso, retención, contenedor caído, pg_dump fallido — 4/4 escenarios OK
- [x] **T4** — `deploy/backups/` agregado a `.gitignore`
- [x] **T5** — Sección "Backups" de `DEPLOY.md` actualizada (uso, cron, aclaración de que no es offsite)

## Fix 2 — Sentry (backend + frontend)

- [x] **T6** — `SENTRY_DSN`/`SENTRY_TRACES_SAMPLE_RATE` en `Settings` (`backend/app/core/config.py`)
- [x] **T7** — `backend/app/core/error_tracking.py` con `init_sentry()` (no-op sin DSN, import lazy, fallback si el paquete no está instalado)
- [x] **T8** — `init_sentry()` llamado en `main.py` antes de crear la app; `sentry-sdk[fastapi]` en `requirements.txt`
- [x] **T9** — Verificado: `from app.main import app` no falla ni con `SENTRY_DSN` vacío ni con `SENTRY_DSN` seteado + paquete no instalado
- [x] **T10** — `frontend/src/shared/lib/sentry.ts` con `initSentry()` (no-op sin `VITE_SENTRY_DSN`)
- [x] **T11** — `initSentry()` llamado en `main.tsx`; `ErrorBoundary.componentDidCatch` reporta a `Sentry.captureException`
- [x] **T12** — `@sentry/react` agregado a `package.json`, `npm install` corrido; `src/vite-env.d.ts` nuevo (tipado de `import.meta.env.VITE_SENTRY_DSN`)
- [x] **T13** — `ARG`/`ENV VITE_SENTRY_DSN` en `frontend/Dockerfile`; build arg pasado desde `docker-compose.prod.yml`
- [x] **T14** — `SENTRY_DSN`/`VITE_SENTRY_DSN` documentadas en `.env.example`

## Fix 3 — Usuarios no-root

- [x] **T15** — `backend/Dockerfile`: usuario `appuser` (UID 1000), `chown` antes de `USER`
- [x] **T16** — `frontend/Dockerfile`: imagen base `nginxinc/nginx-unprivileged:alpine`, puerto 8080
- [x] **T17** — `nginx.conf` (`listen 8080`), `docker-compose.yml` raíz (`8080:8080`), `deploy/Caddyfile` (`web:8080`) actualizados en cascada

## Fix 4 — Escaneo de dependencias en CI

- [x] **T18** — `.github/dependabot.yml` (pip, npm, docker x2, github-actions — semanal)
- [x] **T19** — `pip-audit` agregado a `backend.yml` (informativo, no bloqueante)
- [x] **T20** — `npm audit --audit-level=high` agregado a `frontend.yml` (informativo, no bloqueante)
- [x] **T21** — YAML de `dependabot.yml` y ambos workflows validado con `yaml.safe_load`

## Fix 5 — Security headers

- [x] **T22** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `Strict-Transport-Security` agregados a `nginx.conf`

## Fix 6 — `backend/docker-compose.yml`

- [x] **T23** — `POSTGRES_PASSWORD` parametrizada (`${POSTGRES_PASSWORD:-crow_dev_password}`), igual que el compose raíz
- [x] **T24** — Puerto de Postgres bindeado a `127.0.0.1` en vez de todas las interfaces

## Verificación final

- [x] **T25** — Frontend: `npx tsc --noEmit -p tsconfig.build.json` limpio
- [x] **T26** — Frontend: `npx vitest run` — 57/57 pasando (corrido en 2 tandas por límite de tiempo del entorno)
- [x] **T27** — Backend: suite completa (18 archivos, 249 tests) — 249/249 pasando, corrida en tandas
- [x] **T28** — `docker-compose.yml`, `docker-compose.prod.yml`, `backend/docker-compose.yml`, `.github/dependabot.yml`, ambos workflows de CI — YAML válido
