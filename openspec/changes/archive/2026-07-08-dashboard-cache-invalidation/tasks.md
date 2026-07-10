# Tasks: dashboard-cache-invalidation

- [x] **D1** — Diagnóstico: grep de `inventory`/`stock` en todo el
      backend para descartar una tabla de inventario separada (no existe
      — "inventario" es siempre `Product.stock`/`Product.price`
      calculado al vuelo) y confirmar que solo 4 endpoints en
      `routes/products.py` mutan productos.
- [x] **D2** — `dashboard.py`: nueva función `invalidate_dashboard_cache()`
      junto a `_cache_get`/`_cache_set`.
- [x] **D3** — `products.py`: import + llamada a
      `invalidate_dashboard_cache()` en `create_product`,
      `update_product`, `delete_product`, `restore_product`.
- [x] **D4** — Verificación: cada archivo tocado releído con la
      herramienta de lectura tras escribirlo; `ast.parse()` sobre
      `products.py` para confirmar sintaxis válida (no se pudo correr
      `pytest`/import real de FastAPI — `fastapi` no está instalado en
      este sandbox).
- [x] **D5 (superada)** — El usuario reconstruyó el frontend y probó de
      nuevo: "Inventario" seguía vacío con un producto ya creado y
      visible en Productos. El fix de D2/D3 (cache) era real pero no era
      la causa de esto — ver "Corrección" en `proposal.md`/`design.md`.
- [x] **D6** — Root cause real encontrada: `AdminInventoryPage.tsx`
      pedía `productApi.list({ limit: 200 })`, y `GET /products` en el
      backend tiene `le=100` — la llamada devolvía 422, silenciado por
      `.catch(() => setItems([]))`. Rota para cualquier cantidad de
      productos, no solo para los nuevos.
- [x] **D7** — Fix: `AdminInventoryPage.tsx` reescrito con
      `fetchAllProducts()` — pagina en bloques de 100 (`FETCH_PAGE`,
      documentado con referencia al límite real del backend) hasta cubrir
      `total`, en vez de una sola llamada que excedía el máximo permitido.
- [x] **D8** — Verificación: archivo releído con la herramienta de
      lectura tras escribirlo. Confirmado por grep que ningún otro lugar
      del frontend pide `limit` por encima de 100 contra `/products`
      (`AdminProductsPage` pagina de a 10; `DashboardPage` pide 6).
- [x] **D9** — Verificación local del usuario: reconstruyó el frontend,
      confirmó que "Inventario" ya muestra el producto creado ("bien").
      Change archivado.
