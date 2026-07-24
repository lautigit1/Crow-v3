# Proposal: admin-stats-module

## What

Agregar al panel de administración un módulo dedicado de estadísticas: una página propia (`/admin/estadisticas`, ítem "Estadísticas" en el menú lateral) que unifica gráficos de **tendencias en el tiempo** (ingresos, pedidos y cotizaciones por día/semana/mes) con los gráficos de **estado actual** que ya existían (productos por categoría/vehículo/proveedor, cotizaciones por estado, distribución de stock). Se apoya en un endpoint nuevo `GET /api/dashboard/trends` y en Recharts para la visualización.

## Why

- El admin solo tenía métricas de "foto del momento" (conteos actuales) repartidas entre el Dashboard y la vieja página "Reportes". No había ninguna forma de ver la evolución del negocio en el tiempo: cuántos ingresos, pedidos o cotizaciones entraron por período.
- El modelo `Order` ya tiene `created_at`, `status` y sus ítems con `unit_price_snapshot`/`quantity`, así que las series temporales de ingresos y volumen son derivables sin cambios de schema en la base.
- Pedido directo del usuario en esta sesión: primero "quiero que metamos al panel de admin un módulo de gráficos de estadísticas" y, tras ver las tendencias embebidas en el Dashboard, "quiero que sea un módulo exclusivo para estadísticas" — de ahí la decisión de sacarlas del Dashboard y darles su propia página.

## Non-goals

- No se agregan métricas de tendencia de usuarios nuevos ni de productos: el usuario eligió (vía pregunta explícita) ingresos, pedidos y cotizaciones. `TrendPoint` queda extensible si se quieren sumar después.
- No se hace bucketing con `date_trunc`/`strftime` en SQL: se agrupa en Python a propósito para que el mismo código funcione en Postgres (producción) y SQLite (tests), al volumen de una PyME el costo es despreciable.
- No se toca el esquema de la base (no hay migración): el endpoint es de solo lectura sobre tablas existentes.
- No se conserva la página "Reportes" como entidad separada: quedaba como subconjunto exacto del nuevo módulo, así que se elimina para no duplicar UI y navegación (decisión reversible; ver `apply.md`).

## Success criteria

- Existe un ítem "Estadísticas" en el menú del admin que abre una página dedicada con las tendencias (selector 7d/30d/90d/12m) y el estado actual del catálogo/inventario/demanda.
- `GET /api/dashboard/trends?period=…` (admin-only) devuelve series correctas: ingresos excluyen pedidos cancelados, cada período tiene la granularidad y cantidad de puntos esperada.
- El Dashboard ya no muestra el bloque de tendencias (quedó exclusivo del nuevo módulo).
- `ruff check` + `pytest` (backend) y `tsc` + ESLint + Steiger/FSD + Vitest (frontend) pasan sin regresiones.
