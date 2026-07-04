# Tasks: product-cost-margin

- [x] T1 — Backend: columnas `cost_price`/`margin_pct` en `Product` + migración `010`.
- [x] T2 — Backend: `OptionalAdmin` en `core/deps.py`.
- [x] T3 — Backend: `ProductCreate`/`ProductUpdate`/`ProductRead` con los campos nuevos.
- [x] T4 — Backend: `_serialize_product` + wiring en `list_products`/`get_product`/`list_deleted_products`/`create_product`/`update_product`/`restore_product`.
- [x] T5 — Frontend: `entities/product` con `cost_price`/`margin_pct`.
- [x] T6 — Frontend: `AdminProductsPage` — campos + cálculo bidireccional costo/margen/precio.
- [x] T7 — Frontend: `AdminProductsPage` — drawer de detalle muestra costo/margen/ganancia.
- [x] T8 — Verificación manual (sin `tsc`/pytest en el sandbox): relectura completa de todos los archivos tocados.
