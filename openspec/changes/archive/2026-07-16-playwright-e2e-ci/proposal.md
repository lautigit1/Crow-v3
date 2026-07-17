# Proposal: playwright-e2e-ci

## What

Hallazgo "Alta" #12 de la auditoría técnica del 2026-07-13: correr los 12 tests E2E de Playwright existentes (`frontend/e2e/*.spec.ts`) en CI, en vez de solo poder correrlos manualmente en local.

## Why

Los tests E2E cubren flujos completos reales (login admin, alta de producto, favoritos, compra completa) contra el stack real (Postgres + API + frontend servido), que es justo lo que los tests unitarios/de componente no pueden validar (integración real entre frontend y backend, sesiones vía cookies HttpOnly, etc.). Sin correrlos en CI, una regresión en esos flujos solo se detecta corriendo Playwright a mano.

## Non-goals

- No se agregan tests E2E nuevos — son los 12 ya existentes.
- No se verificó la ejecución real del workflow en este entorno: el sandbox de verificación de esta sesión no tiene daemon de Docker disponible (limitación conocida, documentada en sesiones anteriores), así que `docker compose up` no se pudo correr acá. Se validó lo que sí es verificable sin Docker: sintaxis YAML del workflow y de `docker-compose.yml`, existencia del endpoint `/api/health` que usa el healthcheck, y que los 12 `test(...)` de los specs coinciden con el conteo de la auditoría.

## Success criteria

- Nuevo workflow `.github/workflows/e2e.yml`, disparado en push/PR a `master` cuando cambia `frontend/`, `backend/`, `docker-compose.yml`, o el propio workflow.
- El job levanta el stack completo real vía `docker compose up --build` (mismo `docker-compose.yml` que usa un desarrollador en local), espera a que la API esté healthy, corre `npm run e2e` contra `http://localhost:8080`, y sube el reporte HTML de Playwright como artifact si falla.
- Bloqueante: un fallo en cualquiera de los 12 tests falla el job de CI.
