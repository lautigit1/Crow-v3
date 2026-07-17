# Design: playwright-e2e-ci

## Por qué un workflow separado (no un step más en `frontend.yml`)

`frontend.yml` corre en segundos (typecheck + vitest + build) y no necesita Docker. Levantar el stack completo (Postgres + Redis + API + build de frontend) para E2E toma varios minutos y depende de servicios externos al proceso de Node — mezclarlo en el mismo job haría que cualquier cambio trivial de frontend espere ese tiempo extra, y que un timeout de Docker bloquee el feedback rápido de lint/tests/build que sí es instantáneo. Se separó en `e2e.yml`, con su propio `timeout-minutes: 20`.

## Disparo por `paths`

Se dispara con cambios en `frontend/**`, `backend/**`, `docker-compose.yml`, o el propio workflow — un cambio en `backend/` puede romper un flujo E2E tanto como uno en `frontend/`, así que ambos paths están cubiertos (a diferencia de `frontend.yml`/`backend.yml`, que sí están separados por directorio porque sus checks son independientes por stack).

## Stack real, no mocks

`playwright.config.ts` ya estaba diseñado para esto: no tiene `webServer` configurado a propósito (comentario explícito en el archivo), espera que el stack ya esté arriba, y lee `E2E_BASE_URL` (default `localhost:5173` para dev, pensado para `localhost:8080` contra el stack de `docker-compose.yml`). El workflow usa exactamente ese `docker-compose.yml` de la raíz — el mismo que un desarrollador levantaría en local — no un compose "for CI" separado que podría divergir del real.

## Credenciales del admin seedeado

`backend/app/seed.py` crea el usuario admin a partir de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` al arrancar el contenedor (`Dockerfile` CMD: `python -m app.seed && exec uvicorn ...`). `frontend/e2e/helpers.ts` tiene como default `ADMIN_PASSWORD = "AdminCrow2026!"` (overridable con `E2E_ADMIN_PASSWORD`). El workflow fija `SEED_ADMIN_PASSWORD` y `E2E_ADMIN_PASSWORD` al mismo valor explícitamente, en vez de depender de que los defaults coincidan por casualidad.

## Healthcheck antes de correr los tests

`docker compose up -d` no espera a que la API esté realmente lista para servir tráfico (solo a que el contenedor arranque). Se agregó un step de polling (`curl -sf http://localhost:8000/api/health`, hasta 30 intentos de 5s = 2.5 min de margen) antes de correr Playwright, para no arrancar los tests contra una API que todavía está corriendo migraciones/seed. Si nunca queda healthy, se imprimen los logs de `api` y se falla explícitamente (en vez de dejar que Playwright falle con errores de conexión menos claros).

## Verificación en este entorno (sin Docker)

No se pudo correr `docker compose up` real acá (sin daemon de Docker en el sandbox de esta sesión, limitación ya documentada en cambios anteriores). Se verificó en su lugar:

- `python3 -c "import yaml; yaml.safe_load(...)"` sobre `e2e.yml` y `docker-compose.yml` — ambos YAML válidos.
- `grep` confirmando que `GET /api/health` existe en `backend/app/main.py` (el endpoint que el healthcheck del workflow espera).
- Conteo de `test(...)` en los 4 archivos de `frontend/e2e/*.spec.ts` — exactamente 12, coincidiendo con el hallazgo de la auditoría.

La ejecución real del job (¿el stack levanta, la API queda healthy, los 12 tests pasan contra Chromium?) solo se puede confirmar corriendo el workflow en GitHub Actions, que sí tiene Docker disponible.
