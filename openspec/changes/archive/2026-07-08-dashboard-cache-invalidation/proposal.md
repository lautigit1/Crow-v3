# Proposal: dashboard-cache-invalidation

## Qué

Invalida el cache Redis del dashboard admin (`GET /dashboard` y
`GET /dashboard/analytics`) cada vez que se crea, edita, elimina o
restaura un producto.

## Por qué

El usuario reportó: "cuando creo un producto no se importa al
inventario". El producto sí se crea (aparece de inmediato en
`AdminProductsPage` y en `AdminInventoryPage`, que llaman a
`GET /products` directo, sin cache para admins). Lo que no se actualizaba
era el panel de Dashboard (`DashboardPage.tsx`): el contador "PRODUCTOS",
el chip "INVENTARIO" (`analytics.inventory_value`) y el resto de las
métricas de `/dashboard` y `/dashboard/analytics` quedan en un cache
Redis con TTL de 60 segundos (`dashboard.py`, `_CACHE_TTL = 60`), y nada
en el código invalidaba ese cache al mutar productos — un producto nuevo
podía tardar hasta 60s en reflejarse ahí, y si el usuario miraba el
dashboard antes de eso, parecía que el producto "no entraba al
inventario" aunque sí estaba creado en la base.

## Diagnóstico

- `backend/app/api/routes/dashboard.py` cachea el resultado completo de
  `get_dashboard`/`get_analytics` en Redis (`crow:cache:dashboard`,
  `crow:cache:analytics`) por 60s.
- `backend/app/api/routes/products.py` — `create_product`,
  `update_product`, `delete_product`, `restore_product` — no tocaban ese
  cache en absoluto. Confirmado por grep: ninguna referencia a
  `redis`/`cache` en todo `routes/products.py` antes de este fix.
- No hay otro lugar del backend que mute `Product.stock`/`Product.price`
  fuera de esos cuatro endpoints (confirmado por grep de `stock` en
  `api/routes/`), así que el alcance del fix cubre el 100% de las
  mutaciones posibles.

## Fix

- `dashboard.py`: nueva función pública `invalidate_dashboard_cache()`
  junto a los helpers privados `_cache_get`/`_cache_set` ya existentes —
  borra ambas keys de Redis (`crow:cache:dashboard`,
  `crow:cache:analytics`), no-op silencioso si Redis no está disponible
  (mismo criterio de fallback que el resto del archivo).
- `products.py`: se llama a `invalidate_dashboard_cache()` al final de
  `create_product`, `update_product`, `delete_product` y
  `restore_product`, después de `audit.record(...)` en cada caso.

## Non-goals

- No se toca el TTL de 60s en sí (sigue siendo razonable como colchón
  contra picos de tráfico en el dashboard) — el problema no era la
  duración del cache, era la falta de invalidación activa.
- No se agrega invalidación de cache a otras entidades (categorías,
  marcas, proveedores) — ninguna de ellas alimenta hoy un valor cacheado
  que cambie con su propia mutación fuera de los conteos que ya se
  recalculan en cada `get_dashboard`/`get_analytics` sin cachear por
  entidad individual; fuera de alcance de este reporte puntual.

## Criterio de éxito

- Crear/editar/eliminar/restaurar un producto se refleja de inmediato en
  el Dashboard admin (contador de productos, stock sin existencias,
  valor de inventario, gráficos por categoría/proveedor/vehículo) sin
  esperar el TTL de 60s.
- Sin cambios de comportamiento visible cuando Redis no está configurado
  (mismo fallback silencioso que ya usa el resto del archivo).

## Corrección de diagnóstico: la causa real era otra

Este fix (invalidación de cache) es legítimo y quedó aplicado, pero
**no era la causa** de lo que el usuario reportó. Después de
reconstruir el frontend, `AdminInventoryPage` seguía mostrando "No hay
productos" y $0 en todas las métricas con un producto ya creado y
visible en `AdminProductsPage` (capturas del usuario) — algo que el
cache del dashboard no explica, porque `AdminInventoryPage` no pasa por
`/dashboard` en absoluto, lee `/products` directo.

**Causa real**: `AdminInventoryPage.tsx` pedía `productApi.list({ limit: 200 })`.
El endpoint `GET /products` en `products.py` define
`limit: int = Query(default=24, ge=1, le=100)` — el máximo permitido es
100. Pedir 200 dispara un 422 de validación de FastAPI, y
`AdminInventoryPage` tenía `.catch(() => setItems([]))`, que silenciaba
cualquier error dejando la tabla vacía **sin importar cuántos productos
hubiera** — no era un problema de productos nuevos ni de timing, la
página estaba rota de forma permanente desde que se le puso ese límite.

**Fix real**: `AdminInventoryPage.tsx` ahora pagina en bloques de 100
(el máximo del backend) con `fetchAllProducts()`, acumulando páginas
hasta cubrir `total`, en vez de pedir todo en una sola llamada que
excedía el límite. Ver `design.md` § Corrección para el detalle.
