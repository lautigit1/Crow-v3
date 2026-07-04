# Apply: product-cost-margin

## Archivos tocados

Backend:
- `app/models/product.py` — columnas `cost_price`, `margin_pct`.
- `alembic/versions/010_product_cost_margin.py` — migración nueva.
- `app/core/deps.py` — `get_optional_admin`/`OptionalAdmin`.
- `app/schemas/product.py` — `ProductCreate`/`ProductUpdate`/`ProductRead` con los campos nuevos.
- `app/api/routes/products.py` — `_serialize_product` + `OptionalAdmin` en `list_products`/`get_product`; `create_product`/`update_product`/`restore_product`/`list_deleted_products` devuelven costo real (ya admin-gated).

Frontend:
- `entities/product/index.ts` — `Product`/`ProductInput` con `cost_price?`/`margin_pct?`.
- `pages/admin/AdminProductsPage.tsx` — campos de costo/margen/precio con cálculo bidireccional, precarga en `openEdit`, bloque de costo/margen/ganancia en el drawer de detalle.

## Cómo queda el cálculo

- Cargás costo y margen → precio de venta se calcula solo
  (`costo × (1 + margen/100)`, redondeado a 2 decimales).
- Si en cambio editás el precio de venta directamente (con costo ya
  cargado) → el margen se recalcula solo para reflejar ese precio.
- Sin costo cargado, el precio se sigue editando a mano como siempre
  (comportamiento previo intacto).

## Por qué el costo nunca se expone públicamente

`GET /products` y `GET /products/{id}` son endpoints públicos que
también usa el propio panel de admin (no hay endpoints separados). Se
resolvió con una dependencia `OptionalAdmin` que nunca falla (devuelve
`None` si no hay sesión de admin) y un helper que fuerza
`cost_price`/`margin_pct` a `null` en la respuesta para cualquiera que
no sea admin, sin importar el contenido real de la fila. El panel de
admin ve los valores reales porque llama a esos mismos endpoints con
la cookie de sesión (`withCredentials: true`, ya configurado).

## Verificación

Sandbox sin red -- no se pudo correr `tsc`/`pytest`. Verificación
manual: relectura completa de los 6 archivos tocados (modelo, migración,
deps, schemas, endpoint, entities/product, AdminProductsPage),
confirmando tipos, imports y que `list_deleted_products` (ya admin-only)
y `create/update/restore_product` (ya admin-only) devuelven el costo
real sin pasar por el gate de `OptionalAdmin`.
