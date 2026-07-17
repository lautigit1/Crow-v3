# Design: production-readiness-hardening

## Fix 1 — Backups de Postgres automatizados

**Archivos nuevos:** `deploy/backup-postgres.sh`, `deploy/restore-postgres.sh`

`backup-postgres.sh`: `docker exec crow_db pg_dump | gzip` a un archivo temporal (`.partial`), que solo se renombra al nombre final si el pipe completo termina en éxito (con `set -o pipefail`, si `pg_dump` falla pero `gzip` no, el `if` igual lo detecta). Evita dejar un `.sql.gz` corrupto contando para la retención. Retención configurable por `RETENTION_DAYS` (default 14) vía `find -mtime +N -delete`. Nombre y ruta configurables por env vars (`BACKUP_DIR`, `POSTGRES_CONTAINER`, etc.) para poder testear sin tocar el compose real.

`restore-postgres.sh`: separado del backup a propósito — restaurar sobreescribe la base completa, y pedirle a alguien que escriba a mano un pipe de `gunzip | psql` en medio de un incidente real es exactamente el tipo de situación donde un typo agrava el problema. Pide confirmación explícita (`escribí 'restaurar'`) antes de ejecutar nada.

**Verificación sin Postgres real:** el sandbox de desarrollo no tiene Docker ni Postgres disponibles. Se verificó el script funcionalmente (no solo `bash -n`) con un `docker` stub en `PATH` que simula `docker ps`/`docker exec pg_dump`, cubriendo cuatro escenarios: backup exitoso, retención borrando un archivo viejo, contenedor no corriendo (error controlado), y `pg_dump` fallando a mitad de camino (sin dejar archivo corrupto). Los cuatro se comportaron como se esperaba.

**DEPLOY.md** documenta el uso manual, un ejemplo de entrada de cron (diario a las 3am), y aclara explícitamente que esto no es un backup offsite — vive en el mismo disco que la DB, así que no protege contra la pérdida del servidor completo. `deploy/backups/` se agregó a `.gitignore`.

## Fix 2 — Error tracking con Sentry (backend + frontend)

**Archivos:** `backend/app/core/error_tracking.py` (nuevo), `backend/app/core/config.py`, `backend/app/main.py`, `backend/requirements.txt`; `frontend/src/shared/lib/sentry.ts` (nuevo), `frontend/src/main.tsx`, `frontend/src/app/providers/ErrorBoundary.tsx`, `frontend/src/vite-env.d.ts` (nuevo), `frontend/package.json`.

**Backend:** `SENTRY_DSN`/`SENTRY_TRACES_SAMPLE_RATE` nuevos en `Settings`. `init_sentry()` en `core/error_tracking.py` es un no-op inmediato si `SENTRY_DSN` está vacío (default) — ni siquiera importa `sentry_sdk`, así que development y tests no necesitan el paquete instalado para funcionar. El `import sentry_sdk` está adentro de la función, no a nivel de módulo, específicamente por eso. Si `SENTRY_DSN` está configurada pero el paquete no está instalado, loguea un warning en vez de romper el arranque. `sentry-sdk[fastapi]` se agregó a `requirements.txt` como dependencia real (no opcional a nivel de instalación) para no tener que reconstruir la imagen cuando se agregue el DSN real. `init_sentry()` se llama en `main.py` a nivel de módulo, antes de crear la instancia de `FastAPI`, porque la integración necesita estar activa antes de que se registren rutas y middleware para poder capturarlos.

**Verificado:** import de `app.main` con `SENTRY_DSN` vacío (comportamiento default) y con `SENTRY_DSN` seteado pero `sentry_sdk` no instalado en el venv de test — ambos casos importan sin error, confirmando que los dos guard paths funcionan.

**Frontend:** `VITE_SENTRY_DSN` es una env var de **build time** (Vite la reemplaza por su valor literal al buildear, no es una env var de runtime) — por eso entra como `ARG`/`ENV` en `frontend/Dockerfile`, no como `environment:` en el compose. `initSentry()` en `shared/lib/sentry.ts` no hace nada si `import.meta.env.VITE_SENTRY_DSN` está vacío. `ErrorBoundary.componentDidCatch` llama a `Sentry.captureException(...)` incondicionalmente — es seguro incluso sin DSN configurado porque el SDK no inicializado simplemente ignora la llamada. Se agregó `@sentry/react` a `package.json` y `src/vite-env.d.ts` (no existía; sin él, TypeScript no conoce el tipo de `import.meta.env.VITE_SENTRY_DSN`).

**No se hizo:** configurar un DSN real (requiere una cuenta en sentry.io que no existe en este entorno) ni Session Replay / performance monitoring más allá del sampling básico de traces.

## Fix 3 — Usuarios no-root en los Dockerfiles

**`backend/Dockerfile`:** se agrega un grupo/usuario `appuser` (UID/GID 1000) y `chown -R appuser:appuser /app` **antes** del `USER appuser` — el orden importa, porque una vez hecho el switch de usuario ya no se puede escribir como root. No se detectaron escrituras al filesystem en `app/` (no hay uploads locales; las imágenes van a Cloudinary), así que no hace falta ningún volumen adicional con permisos especiales.

**`frontend/Dockerfile`:** en vez de agregar manualmente un usuario a la imagen `nginx:alpine` (que requeriría además resolver que nginx pueda escribir su PID file, logs, etc. como no-root), se cambió la imagen base del stage de serving a `nginxinc/nginx-unprivileged:alpine` — una imagen oficial mantenida por el mismo equipo de nginx, pensada exactamente para este caso, que corre como usuario `nginx` sin configuración adicional. La contrapartida es que no puede bindear el puerto 80 (privilegiado, requiere root), así que escucha en 8080. Esto se propagó a: `nginx.conf` (`listen 8080`), `Dockerfile` (`EXPOSE 8080`), `docker-compose.yml` raíz (`ports: "8080:8080"`, antes `"8080:80"`), y `deploy/Caddyfile` (`reverse_proxy web:8080`, antes `web:80`). El mapeo de puerto visible para el usuario final no cambia — `http://localhost:8080` sigue siendo la URL en dev, y en producción Caddy sigue siendo el único punto de entrada externo.

## Fix 4 — Escaneo de dependencias en CI

**Archivos:** `.github/dependabot.yml` (nuevo), `.github/workflows/backend.yml`, `.github/workflows/frontend.yml`.

`dependabot.yml` cubre cinco ecosistemas: pip (`/backend`), npm (`/frontend`), Docker (imágenes base de ambos Dockerfiles) y github-actions (versión de las actions usadas en los workflows) — todos con chequeo semanal.

Además del PR automático de Dependabot cuando hay una versión nueva, se agregó un paso de auditoría activa en cada corrida de CI: `pip-audit -r requirements.txt` en `backend.yml`, `npm audit --audit-level=high` en `frontend.yml`. Ambos con `|| true` al final — **no bloquean el build** por ahora. Es una decisión deliberada: sin datos de cuánto ruido generan en este proyecto específico, hacerlos bloqueantes desde el día uno arriesga romper CI por una CVE de severidad baja en una dependencia transitiva que no es explotable en el contexto real de la app. Queda como paso siguiente evaluar el nivel de ruido real y endurecer a bloqueante si es bajo.

## Fix 5 — Security headers en nginx

**Archivo:** `frontend/nginx.conf`

Se agregaron seis headers al `server` block, aplicados a toda respuesta (`always`, para que se agreguen incluso en respuestas de error):

- `X-Frame-Options: DENY` — el sitio no necesita ser embebido en un iframe de terceros.
- `X-Content-Type-Options: nosniff` — evita MIME-sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — no filtra la URL completa a sitios externos.
- `Permissions-Policy` — deshabilita cámara/micrófono/geolocalización, que la app no usa.
- `Content-Security-Policy` — `default-src 'self'`, con `img-src` permitiendo explícitamente `res.cloudinary.com` (storage real de imágenes de producto) además de `data:` y `'self'`. `script-src`/`style-src` incluyen `'unsafe-inline'` porque el bundle de Vite y algunas libs de UI inyectan `<style>` en runtime — una CSP más estricta (con nonces) es un cambio de mayor alcance que toca el pipeline de build, fuera de este fix puntual.
- `Strict-Transport-Security` — con `max-age` de 2 años e `includeSubDomains`. Se agrega incondicionalmente porque no tiene efecto (el browser la ignora) en conexiones HTTP planas de desarrollo, y sí lo tiene cuando Caddy sirve por HTTPS en producción.

Se evaluó agregar estos headers en el `Caddyfile` en vez de en nginx, pero Caddy en este stack solo hace de terminador TLS y hace `reverse_proxy` a nginx (ver `docker-compose.prod.yml`) — nginx es la capa que efectivamente construye cada respuesta HTTP, así que es el lugar correcto.

## Fix 6 — `backend/docker-compose.yml`: password hardcodeado y puerto expuesto

**Archivo:** `backend/docker-compose.yml`

Este compose es explícitamente de desarrollo local (documentado en `backend/README.md`: "Postgres + API, sin frontend/nginx/Redis... no usar en producción"), no un artefacto legacy sin uso — por eso se corrige en vez de eliminarse, siguiendo el mismo criterio que ya se aplicó en el historial del proyecto (`2026-06-29-critical-fixes`, `2026-07-04-prod-readiness-fixes`).

Dos problemas reales pese a ser dev-only:

1. `POSTGRES_PASSWORD: crow_dev_password` estaba hardcodeado en texto plano (no como `${VAR}`), a diferencia del compose de la raíz, que ya usa `${POSTGRES_PASSWORD:-crow_dev_password}`. Se alineó al mismo patrón.
2. El puerto 5432 se publicaba con `"5432:5432"`, que en Docker bindea a `0.0.0.0` — todas las interfaces de red, no solo localhost. En una laptop de desarrollador detrás de NAT esto es inofensivo, pero en una VM de desarrollo con IP pública (común en equipos que usan devboxes en la nube) expone Postgres a internet. Se cambió a `"127.0.0.1:5432:5432"`, que preserva la conveniencia de conectar un cliente de DB local (DBeaver, TablePlus) sin exponer el puerto a la red.
