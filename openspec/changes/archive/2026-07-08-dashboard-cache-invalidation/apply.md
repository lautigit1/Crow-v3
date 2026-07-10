# Apply: dashboard-cache-invalidation

> Nota: este apply.md se escribió el 2026-07-10, reconstruido desde
> `tasks.md`/`proposal.md` (el change se implementó y archivó en una
> sesión anterior que no dejó este artefacto).

## Resumen

Dos fixes encadenados a partir del reporte "cuando creo un producto no se
importa al inventario":

1. **Fix legítimo pero no causal**: el cache Redis del dashboard
   (`crow:cache:dashboard`, `crow:cache:analytics`, TTL 60 s) no se
   invalidaba al mutar productos.
2. **Causa real**: `AdminInventoryPage` pedía `limit: 200` a
   `GET /products`, cuyo máximo es `le=100` → 422 silenciado por un
   `.catch(() => setItems([]))` — la página estaba rota siempre, con
   cualquier cantidad de productos.

## Archivos modificados

- `backend/app/api/routes/dashboard.py` — nueva función pública
  `invalidate_dashboard_cache()` (borra ambas keys; no-op sin Redis).
- `backend/app/api/routes/products.py` — llamada a
  `invalidate_dashboard_cache()` en `create_product`, `update_product`,
  `delete_product` y `restore_product`.
- `frontend/src/pages/admin/AdminInventoryPage.tsx` — reescrito con
  `fetchAllProducts()`: pagina en bloques de 100 (`FETCH_PAGE`, el máximo
  real del backend) acumulando hasta cubrir `total`.

## Verificación

- Grep: ningún otro lugar del frontend pide `limit > 100` a `/products`.
- Verificación del usuario en su máquina: "Inventario" muestra el
  producto creado tras reconstruir el frontend.
- Verificación de apply previa a completar el archivado (2026-07-10):
  `invalidate_dashboard_cache` definida en `dashboard.py:42` y llamada
  4 veces en `products.py`; `fetchAllProducts`/`FETCH_PAGE` presentes en
  `AdminInventoryPage.tsx`. ✓
