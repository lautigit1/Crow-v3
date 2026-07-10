# Design: dashboard-cache-invalidation

## Archivos

- `backend/app/api/routes/dashboard.py` — nueva función
  `invalidate_dashboard_cache()`, ubicada junto a `_cache_get`/
  `_cache_set` bajo el mismo comentario de sección
  (`# ── Redis cache helpers ──`). Import perezoso de `get_redis()`
  dentro de la función (mismo patrón que los otros dos helpers, evita
  importar `redis_client` a nivel de módulo). Borra las dos keys con
  `r.delete("crow:cache:dashboard", "crow:cache:analytics")` en una sola
  llamada; `try/except Exception: pass` alrededor, igual que
  `_cache_set`, para que un Redis caído no rompa el endpoint que la
  llama.
- `backend/app/api/routes/products.py` — import a nivel de módulo:
  `from app.api.routes.dashboard import invalidate_dashboard_cache`. Sin
  riesgo de import circular: `dashboard.py` no importa nada de
  `routes/products.py` (confirmado por lectura completa del archivo).
  Se llama al final de cada uno de los cuatro endpoints mutantes,
  después de `audit.record(...)`:
  - `create_product` (`POST /products`)
  - `update_product` (`PATCH /products/{id}`, cubre también el ajuste
    rápido de stock que hace `AdminInventoryPage`, que pega contra este
    mismo endpoint)
  - `delete_product` (`DELETE /products/{id}`, soft delete)
  - `restore_product` (`PATCH /products/{id}/restore`)

## Por qué invalidar en vez de, por ejemplo, escribir el nuevo valor directo

Recalcular `DashboardStats`/`Analytics` completos en cada mutación de
producto y volver a poblar el cache ahí mismo sería más trabajo (son
~10 queries agregadas entre los dos endpoints) para un beneficio menor:
el próximo `GET /dashboard` de todos modos va a llegar en segundos
(el admin recién actuó sobre un producto, es lógico que vuelva a mirar
el dashboard) y va a recalcular una sola vez. Invalidar es una operación
O(1) contra Redis y reusa exactamente la misma lógica de cómputo que ya
existe en `get_dashboard`/`get_analytics` — no hay dos copias del mismo
cálculo para mantener sincronizadas.

## Por qué no se movió a un middleware o a un event hook de SQLAlchemy

Un hook a nivel de sesión (`after_flush`/`after_commit` sobre `Product`)
invalidaría el cache automáticamente sin tener que acordarse de llamarlo
en cada endpoint nuevo que toque productos — más a prueba de futuros
olvidos. Se descartó por alcance: este fix es puntual sobre un bug
reportado, y los cuatro endpoints que mutan `Product` ya están
identificados y son estables (confirmado por grep, ver `proposal.md` §
Diagnóstico). Si en el futuro aparece un quinto lugar que mute stock/
precio fuera de `routes/products.py`, ahí sí conviene migrar a un hook
de sesión en vez de seguir agregando llamadas sueltas.

## Corrección: causa real en `AdminInventoryPage.tsx`, no en el cache

Tras aplicar la invalidación de cache de arriba, el usuario reconstruyó
el frontend y el problema seguía igual: "Inventario" mostraba "No hay
productos" y los tres `StatCard` en $0/0, con un producto ya creado y
visible en `AdminProductsPage` (1 producto, "Kit de frenos delanteros",
stock 10). Eso descarta el cache como causa — `AdminInventoryPage` nunca
llama a `/dashboard`, llama directo a `/products`.

**Root cause real**: `AdminInventoryPage.tsx` línea 17 (antes del fix):
```ts
const load = () => productApi.list({ limit: 200 }).then((r) => setItems(r.items)).catch(() => setItems([]));
```
`GET /products` en `backend/app/api/routes/products.py` acota
`limit: int = Query(default=24, ge=1, le=100)`. `limit=200` viola ese
`le=100` → FastAPI devuelve `422 Unprocessable Entity` antes de tocar la
base. El `.catch(() => setItems([]))` conviene silencioso ese error en
una lista vacía — la tabla, el resumen y los `StatCard` quedan en cero
sin ningún indicio de que hubo un error de red. Esto es independiente de
cuántos productos existan: con 1 o con 1000, la llamada fallaba igual.

**Por qué `AdminProductsPage.tsx` nunca mostró este bug**: pagina con
`limit: PAGE` donde `PAGE = 10` (constante del archivo) — nunca se
acerca al tope de 100, así que jamás disparó el 422. Por eso Productos
funcionaba bien mientras Inventario estaba roto.

**Fix**: `AdminInventoryPage.tsx` ahora define `FETCH_PAGE = 100`
(el máximo real del backend, documentado en un comentario que apunta a
la constraint de `products.py`) y una función `fetchAllProducts()` que
pagina con `skip`/`limit` hasta acumular `total` productos, en vez de
pedir todo en una sola llamada:
```ts
async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let skip = 0;
  for (;;) {
    const r = await productApi.list({ limit: FETCH_PAGE, skip });
    all.push(...r.items);
    skip += r.items.length;
    if (r.items.length === 0 || skip >= r.total) break;
  }
  return all;
}
```
Esto además corrige un problema latente que el bug del 422 tapaba: antes,
aunque `limit: 200` hubiera sido válido, un catálogo de más de 200
productos igual se habría truncado en Inventario. Con la paginación, el
tope de una sola request ya no limita cuántos productos puede mostrar la
página.

## Riesgos / verificación

- Sin tests automatizados para el cache de dashboard en este repo
  (confirmado por grep de `crow:cache` en `backend/tests/`, sin
  resultados) — este fix no agrega uno nuevo, cae dentro del mismo
  criterio ya aceptado en otros changes de este proyecto de dejar
  `pytest`/`tsc`/build para verificación local del usuario.
- Redis es opcional en este proyecto (`init_redis` con fallback
  silencioso) — en un entorno sin Redis configurado, tanto el cache como
  esta invalidación son no-ops; el bug reportado tampoco existía ahí (sin
  cache, `get_dashboard`/`get_analytics` siempre recalculan fresco), así
  que el fix es inocuo en ese escenario.
