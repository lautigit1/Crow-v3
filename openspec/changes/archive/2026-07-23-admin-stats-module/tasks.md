# Tasks: admin-stats-module

## Implementation tasks

- [x] **T1** — Preguntar alcance al usuario (dónde vive el módulo + qué métricas): eligió página nueva "Estadísticas", con tendencias + estado actual, usando Recharts, y métricas ingresos/pedidos/cotizaciones.
- [x] **T2** — Backend: schemas `TrendPoint` y `Trends` en `backend/app/schemas/dashboard.py`.
- [x] **T3** — Backend: endpoint `GET /api/dashboard/trends` en `dashboard.py` con `_bucket_plan()` (día/semana/mes), cálculo de ingresos por pedido (excluye CANCELADO), conteo de pedidos y cotizaciones, y cache Redis (`trends:{period}`).
- [x] **T4** — Backend: extender `invalidate_dashboard_cache()` para borrar las claves de trends.
- [x] **T5** — Backend: 8 tests en `tests/test_dashboard.py` (acceso admin/auth, forma de cada período, período inválido → 422, conteo de ingresos/pedidos/cotizaciones de hoy, cancelado suma pedido pero no ingreso).
- [x] **T6** — Frontend: `recharts@^2.15.4` en `package.json` + `package-lock.json`.
- [x] **T7** — Frontend: tipos `TrendPeriod`/`TrendPoint`/`Trends` y `dashboardApi.trends()` en `entities/dashboard/index.ts`.
- [x] **T8** — Frontend: componente `pages/admin/ui/TrendsSection.tsx` (selector de período, totales, AreaChart de ingresos, LineChart de pedidos+cotizaciones; tooltip nativo tipado, sin `any`).
- [x] **T9** — Frontend: página `pages/admin/AdminStatsPage.tsx` (tendencias + estado actual reutilizando `BarChart`/`DonutChart`/`StatCard`).
- [x] **T10** — Frontend: ítem de menú "Estadísticas" en `AdminLayout.tsx` y ruta `/admin/estadisticas` en `App.tsx` (reemplazan a "Reportes").
- [x] **T11** — Frontend: sacar `TrendsSection` del `DashboardPage.tsx` y apuntar la acción rápida a `/admin/estadisticas`.
- [x] **T12** — Frontend: eliminar `pages/admin/AdminReportsPage.tsx` (subconjunto del nuevo módulo).
- [x] **T13** — Fix CI: `from collections.abc import Callable` en `dashboard.py` (regla `UP035` de ruff, bloqueaba Backend CI).
- [x] **T14** — Backend: `ruff check .` sin errores y `pytest` sin regresiones (dashboard + orders + quotes + resto, todos verdes; +8 nuevos de trends).
- [x] **T15** — Frontend (verificado en copia a disco local por el mount de Windows): `npm ci` OK, `tsc -p tsconfig.build.json` sin errores, ESLint 0 errores, Steiger/FSD sin problemas, `vitest run` 83/83.

## Pendiente (del lado del usuario)

- [ ] **U1** — Correr `npm install` en `frontend/` en la máquina local para materializar recharts (el sandbox no puede instalar de forma confiable sobre el mount de Windows).
- [ ] **U2** — E2E (Playwright + `docker compose`) no se ejecutó en el sandbox (requiere levantar el stack con Docker); el módulo no altera los flujos E2E existentes.
