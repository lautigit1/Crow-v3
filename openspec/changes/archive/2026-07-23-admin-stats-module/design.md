# Design: admin-stats-module

## Backend: `GET /api/dashboard/trends` con bucketing en Python

`backend/app/api/routes/dashboard.py` suma un endpoint admin-only `get_trends(period: Period = "30d")`, con `Period = Literal["7d","30d","90d","12m"]`. Devuelve el schema nuevo `Trends` (`backend/app/schemas/dashboard.py`): `period`, `granularity` (`"day"|"week"|"month"`) y `points: list[TrendPoint]`, donde cada `TrendPoint` es `{date, revenue, orders, quotes}` con `date` = ISO del inicio del bucket.

El bucketing se hace en memoria a propósito (no con `date_trunc`, que es solo de Postgres, ni `strftime`, solo de SQLite que usan los tests). `_bucket_plan(period)` devuelve la lista ordenada de buckets, la granularidad y una función `bucket_of(date) -> date`:

- `7d`/`30d` → buckets diarios (7 y 30 puntos), `bucket_of = identidad`.
- `90d` → 13 buckets semanales, `bucket_of` mapea cada fecha al lunes de su semana.
- `12m` → 12 buckets mensuales, `bucket_of` mapea al primero del mes.

Se calcula un `cutoff = datetime.combine(buckets[0], min.time())` y se traen solo las filas con `created_at >= cutoff`. `_as_date()` normaliza `datetime`/`date` (Postgres devuelve tz-aware, SQLite naive) antes de bucketizar.

**Ingresos y pedidos:** un total por pedido vía `func.sum(OrderItem.unit_price_snapshot * OrderItem.quantity)` agrupado por `Order.id` (join externo para no perder pedidos sin ítems). Cada pedido cuenta como `orders += 1`; el ingreso se suma solo si `status != OrderStatus.CANCELADO` (un pedido cancelado se creó, pero no es ingreso real). **Cotizaciones:** conteo simple de `Quote.created_at >= cutoff` por bucket.

**Cache:** mismo patrón que `/dashboard` y `/analytics` — se cachea el JSON en Redis con clave `trends:{period}` y TTL de 60s. `invalidate_dashboard_cache()` se extendió para borrar también las 4 claves de trends cuando cambian productos/pedidos.

## Frontend: Recharts + `TrendsSection`

Se agregó `recharts` (`^2.15.4`) a `package.json`/`package-lock.json`. `entities/dashboard/index.ts` suma los tipos `TrendPeriod`, `TrendPoint`, `Trends` y el método `dashboardApi.trends(period)`.

`frontend/src/pages/admin/ui/TrendsSection.tsx` (nuevo) es un widget autónomo: maneja su propio estado/fetch por período, selector segmentado (7d/30d/90d/12m), tres tarjetas de totales, un `AreaChart` de ingresos y un `LineChart` con dos líneas (pedidos + cotizaciones), todo con la paleta corporativa (`color` de `shared/config`).

Decisión de tipos deliberada: se usa el tooltip **nativo** de Recharts con `formatter`/`labelFormatter` en vez de un componente de tooltip custom, y los parámetros de los formatters **no se anotan** (se coercionan con `Number()`/`String()`). Recharts tipa esos parámetros como `ValueType` (`number | string | …`); anotarlos como `number` rompería `tsc` por contravarianza de parámetros bajo `strictFunctionTypes`. Sin `any` ni non-null assertions, para pasar ESLint y el typecheck sin sorpresas.

## Página dedicada: `AdminStatsPage` reemplaza a `AdminReportsPage`

`frontend/src/pages/admin/AdminStatsPage.tsx` (nuevo) compone `AdminHeader` + `<TrendsSection/>` (tendencias, arriba) + un bloque "Estado actual" que reutiliza `BarChart`/`DonutChart`/`StatCard` (los gráficos de la vieja Reportes). `TrendsSection` renderiza siempre (maneja su propio loading/error), así que la página no bloquea las tendencias esperando a `/analytics`.

Cableado:
- `AdminLayout.tsx`: el ítem de menú "Reportes" (`/admin/reportes`, ícono `reports`) pasó a "Estadísticas" (`/admin/estadisticas`, ícono `trendingUp`).
- `App.tsx`: el lazy import + `<Route path="reportes">` de `AdminReportsPage` se reemplazaron por `AdminStatsPage` en `path="estadisticas"`.
- `DashboardPage.tsx`: se quitó el `<TrendsSection/>` que se había puesto antes (ahora es exclusivo del módulo) y la acción rápida "Reportes" apunta a "Estadísticas".
- `AdminReportsPage.tsx` se **eliminó** (git lo registra como rename → `AdminStatsPage.tsx`), sin consumidores tras el recableo. Ningún spec E2E referenciaba `reportes`.

## Fix de CI incluido

`ruff check .` (bloqueante en Backend CI) fallaba por `from typing import Callable` — la regla `UP035` exige `from collections.abc import Callable`. Se corrigió en `dashboard.py`. Era la causa concreta de que el Backend CI no pasara.

## Nota de entorno: verificación del frontend

El `node_modules` de `frontend/` vive sobre un mount de Windows donde las operaciones masivas de archivos del sandbox fallan/se cortan por timeout, así que `npm install`/`npm ci` no completan de forma confiable ahí. Para verificar el pipeline del CI se copió el frontend al disco local del sandbox (`/tmp/fe`, sin `node_modules`) y se corrió `npm ci` (7s con cache caliente — lo que además confirma que el lock quedó en sync), luego `tsc -p tsconfig.build.json`, `eslint`, `steiger` y `vitest run`. El código real del repo es idéntico al verificado.
