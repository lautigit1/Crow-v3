# Apply: admin-stats-module

## Resumen

Agrega un módulo exclusivo de estadísticas al panel admin: una página propia (`/admin/estadisticas`) que combina gráficos de tendencias en el tiempo (ingresos, pedidos, cotizaciones por día/semana/mes) con los gráficos de estado actual que antes vivían en "Reportes". Se apoya en un endpoint nuevo `GET /api/dashboard/trends` y en Recharts. Pedido del usuario: "quiero que metamos al panel de admin un módulo de gráficos de estadísticas" y luego "quiero que sea un módulo exclusivo para estadísticas". Incluye además el fix del error de `ruff` que estaba rompiendo el Backend CI.

## Archivos modificados

**Backend:**
- `backend/app/schemas/dashboard.py` — schemas `TrendPoint` y `Trends`.
- `backend/app/api/routes/dashboard.py` — endpoint `GET /api/dashboard/trends` con bucketing en Python (día/semana/mes), ingresos excluyendo pedidos cancelados, cache Redis por período, e invalidación de cache extendida. Fix `Callable` desde `collections.abc` (ruff `UP035`).
- `backend/tests/test_dashboard.py` — 8 tests nuevos para `/trends`.

**Frontend — nuevos:**
- `frontend/src/pages/admin/AdminStatsPage.tsx` — página "Estadísticas" (tendencias + estado actual).
- `frontend/src/pages/admin/ui/TrendsSection.tsx` — widget de tendencias con Recharts (selector de período, totales, area + line charts).

**Frontend — modificados:**
- `frontend/src/entities/dashboard/index.ts` — tipos `TrendPeriod`/`TrendPoint`/`Trends` y `dashboardApi.trends()`.
- `frontend/src/pages/admin/AdminLayout.tsx` — ítem de menú "Reportes" → "Estadísticas" (`/admin/estadisticas`, ícono `trendingUp`).
- `frontend/src/app/App.tsx` — lazy import + ruta `reportes`/`AdminReportsPage` → `estadisticas`/`AdminStatsPage`.
- `frontend/src/pages/admin/DashboardPage.tsx` — se quitó `TrendsSection`; acción rápida "Reportes" → "Estadísticas".
- `frontend/package.json`, `frontend/package-lock.json` — `recharts@^2.15.4` (+ árbol de dependencias en el lock).

**Frontend — eliminados:**
- `frontend/src/pages/admin/AdminReportsPage.tsx` — subconjunto exacto del nuevo módulo (git lo registra como rename → `AdminStatsPage.tsx`).

## Decisiones documentadas

- Ubicación y contenido decididos con el usuario vía pregunta explícita: página nueva dedicada (no consolidar en Reportes, no dejar resumen en el Dashboard) y "todo junto" (tendencias + estado actual).
- Bucketing en Python en vez de SQL (`date_trunc`/`strftime`) para que funcione igual en Postgres y en el SQLite de los tests.
- Ingresos calculados desde `OrderItem` (no hay columna `total` en `Order`); pedidos cancelados cuentan como pedido pero no como ingreso.
- Tooltip nativo de Recharts con formatters sin anotar (coerción `Number()`/`String()`) para no romper `tsc` por contravarianza de `ValueType`; sin `any` ni non-null assertions.
- Se eliminó "Reportes" en vez de dejar dos páginas casi idénticas; la nueva "Estadísticas" la contiene por completo. Reversible si se quiere volver a separarlas.

## Verificación

- Backend: `ruff check .` → sin errores (tras el fix de `Callable`). `pytest` → sin regresiones, con los 8 tests nuevos de `/trends` en verde (dashboard, orders y quotes verificados; resto de módulos sin cambios).
- Frontend (verificado en copia a disco local del sandbox por la imposibilidad de `npm install` sobre el mount de Windows): `npm ci` OK (confirma lock en sync + recharts y su árbol), `tsc --noEmit -p tsconfig.build.json` → 0 errores, `eslint` → 0 errores, `steiger ./src` → sin problemas, `vitest run` → 83/83.

## Pendiente / limitaciones

- El usuario debe correr `npm install` en `frontend/` en su máquina para ver los gráficos localmente (recharts quedó declarado en `package.json`/lock pero el sandbox no pudo materializarlo sobre el mount de Windows).
- E2E (Playwright + `docker compose`) no se corrió en el sandbox (requiere Docker); el cambio no altera los flujos E2E existentes.
- Independiente de este change: el working tree tiene una discrepancia global de fin de línea (CRLF→LF) preexistente que hace que git marque casi todo el repo como modificado; conviene resolverla aparte con un `.gitattributes` (`* text=auto eol=lf`) y un renormalizado.
