# Apply: production-readiness-hardening

## Resumen

Seis fixes de infraestructura que cierran los hallazgos críticos de DevOps/producción de la auditoría del 2026-07-13: backups automatizados, error tracking (Sentry, opcional/guarded), usuarios no-root en Docker, escaneo de dependencias en CI, security headers en nginx, y corrección del compose de desarrollo del backend.

## Archivos modificados

**Nuevo:**
- `deploy/backup-postgres.sh` — backup automatizado con retención.
- `deploy/restore-postgres.sh` — restore con confirmación explícita.
- `.github/dependabot.yml` — pip, npm, docker (x2), github-actions.
- `backend/app/core/error_tracking.py` — `init_sentry()`, no-op sin DSN.
- `frontend/src/shared/lib/sentry.ts` — `initSentry()`, no-op sin DSN.
- `frontend/src/vite-env.d.ts` — tipado de `import.meta.env.VITE_SENTRY_DSN`.

**Modificado:**
- `backend/Dockerfile` — usuario `appuser` no-root.
- `frontend/Dockerfile` — imagen `nginx-unprivileged`, puerto 8080, `ARG VITE_SENTRY_DSN`.
- `frontend/nginx.conf` — `listen 8080` + 6 security headers.
- `backend/app/core/config.py` — `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`.
- `backend/app/main.py` — `init_sentry()` antes de crear la app.
- `backend/requirements.txt` — `sentry-sdk[fastapi]`.
- `frontend/src/main.tsx` — `initSentry()` al bootstrap.
- `frontend/src/app/providers/ErrorBoundary.tsx` — reporta a `Sentry.captureException`.
- `frontend/package.json` — `@sentry/react`.
- `.github/workflows/backend.yml` — paso `pip-audit`.
- `.github/workflows/frontend.yml` — paso `npm audit`.
- `docker-compose.yml` (raíz) — puerto del frontend `8080:8080`.
- `docker-compose.prod.yml` — `SENTRY_DSN` para `api`, build arg `VITE_SENTRY_DSN` para `web`.
- `deploy/Caddyfile` — `reverse_proxy web:8080`.
- `backend/docker-compose.yml` — password parametrizada, puerto de Postgres bindeado a localhost.
- `.env.example` — `SENTRY_DSN`, `VITE_SENTRY_DSN`.
- `.gitignore` — `deploy/backups/`.
- `DEPLOY.md` — sección "Backups" reescrita.

## Decisiones documentadas

- `backend/docker-compose.yml` se corrigió, no se eliminó — es un compose de desarrollo local intencional y documentado en `backend/README.md`, no un artefacto legacy (ver `design.md` para el precedente en el historial del proyecto).
- Sentry es 100% opt-in: sin `SENTRY_DSN`/`VITE_SENTRY_DSN`, ni el backend ni el frontend importan o inicializan ningún SDK de Sentry. Verificado explícitamente (ver `tasks.md` T9).
- `pip-audit`/`npm audit` en CI son informativos, no bloqueantes, hasta evaluar el nivel de ruido real en este proyecto.
- El frontend pasó de `nginx:alpine` a `nginxinc/nginx-unprivileged:alpine` (puerto 8080 en vez de 80) para lograr no-root sin configuración manual — esto propagó el cambio de puerto interno a 4 archivos (`nginx.conf`, `Dockerfile`, `docker-compose.yml`, `Caddyfile`); el puerto expuesto al usuario final (`localhost:8080` en dev, dominio HTTPS en prod vía Caddy) no cambió.
- CSP incluye `'unsafe-inline'` en `script-src`/`style-src` porque el bundle de Vite y algunas libs de UI inyectan `<style>` en runtime; una CSP con nonces es un cambio de mayor alcance, fuera de este fix.

## Verificación

- **Backups:** verificación funcional (no solo `bash -n`) con un `docker` stub simulando `docker ps`/`docker exec pg_dump` — 4 escenarios cubiertos: backup exitoso, retención borrando un archivo de +14 días, contenedor no corriendo (falla controlada), `pg_dump` fallando a mitad de camino (sin dejar `.sql.gz` corrupto). Los 4 se comportaron correctamente.
- **Sentry backend:** `from app.main import app` verificado sin error en dos escenarios — `SENTRY_DSN` vacío (default) y `SENTRY_DSN` seteado con `sentry_sdk` no instalado en el venv de test (fallback a warning, no crash).
- **Sentry frontend + todo lo demás del frontend:** `npx tsc --noEmit -p tsconfig.build.json` limpio. `npx vitest run` (corrido en 2 tandas por el límite de tiempo del entorno de verificación) — 57/57 tests pasando, sin regresiones.
- **Backend completo:** suite de 18 archivos / 249 tests, corrida en tandas — 249/249 pasando, sin regresiones por los cambios en `config.py`/`main.py`/`Dockerfile`.
- **YAML:** `docker-compose.yml`, `docker-compose.prod.yml`, `backend/docker-compose.yml`, `.github/dependabot.yml`, `.github/workflows/backend.yml`, `.github/workflows/frontend.yml` — todos parseados sin error con `yaml.safe_load`.
- **No verificado (requiere infraestructura real fuera de este entorno):** build real de las imágenes Docker (no hay Docker daemon en el sandbox de desarrollo) — el Dockerfile del backend y el `nginx-unprivileged` del frontend se revisaron manualmente línea por línea pero no se construyeron; tampoco se probó un backup contra un Postgres real (solo con el stub descripto arriba); tampoco se activó un DSN de Sentry real (requiere una cuenta en sentry.io).

## Pendiente (fuera de alcance de este change)

- Backup offsite (S3/GCS/etc.) — depende del proveedor de storage que se elija en el servidor real de producción.
- Endurecer `pip-audit`/`npm audit` a bloqueantes en CI, una vez evaluado el nivel de ruido real.
- CSP más estricta con nonces en vez de `'unsafe-inline'` — cambio de mayor alcance sobre el pipeline de build de Vite.
- Build y smoke-test real de ambas imágenes Docker contra un Docker daemon real, y prueba end-to-end de `backup-postgres.sh`/`restore-postgres.sh` contra un Postgres real — ninguno de los dos está disponible en este entorno de desarrollo.
