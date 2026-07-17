# Apply: playwright-e2e-ci

## Resumen

Nuevo workflow de GitHub Actions (`.github/workflows/e2e.yml`) que levanta el stack completo real vía `docker-compose.yml` y corre los 12 tests E2E de Playwright existentes contra él, bloqueante en CI. Hallazgo "Alta" #12 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `.github/workflows/e2e.yml` (nuevo)

## Decisiones documentadas

- Workflow separado de `frontend.yml`/`backend.yml` — E2E toma minutos (levanta Docker) vs. segundos de lint/tests/build; no se quiso ralentizar el feedback loop rápido existente.
- Se dispara con cambios en `frontend/`, `backend/`, o `docker-compose.yml` (a diferencia de los otros dos workflows, separados por stack) porque un flujo E2E puede romperse por un cambio en cualquiera de los dos lados.
- Usa el `docker-compose.yml` real de la raíz (el mismo que un desarrollador levanta en local), no un compose paralelo "solo para CI".
- Credenciales del admin seedeado (`SEED_ADMIN_PASSWORD`) fijadas explícitamente en el workflow para que coincidan con el default que ya usan los specs (`e2e/helpers.ts`), en vez de depender de que ambos valores por default sigan coincidiendo por casualidad en el futuro.
- Healthcheck por polling sobre `/api/health` antes de correr Playwright — `docker compose up -d` no garantiza que la API esté lista para servir tráfico.

## Verificación

- `python3 -c "import yaml; yaml.safe_load(...)"` sobre `e2e.yml` y `docker-compose.yml` → ambos YAML válidos.
- `grep` confirmó `GET /api/health` en `backend/app/main.py`.
- Conteo de `test(...)` en los 4 specs de `frontend/e2e/` → 12, coincide con el hallazgo de la auditoría.

## Pendiente / limitaciones

- **No se pudo ejecutar el workflow de punta a punta en este entorno**: el sandbox de verificación de esta sesión no tiene daemon de Docker disponible (limitación conocida, documentada en cambios anteriores de esta misma sesión). La primera ejecución real será en GitHub Actions (que sí tiene Docker), donde se debe confirmar que el stack levanta sin errores, la API queda healthy dentro del timeout de 2.5 min, y los 12 tests pasan contra Chromium.
- Si algún test resulta flaky contra el stack completo en CI (timing distinto al de un entorno local), puede necesitar ajustar los timeouts de `playwright.config.ts` (ya generosos: 60s por test, 15s de `expect`) — no se tocaron preventivamente sin evidencia real de que hagan falta.
