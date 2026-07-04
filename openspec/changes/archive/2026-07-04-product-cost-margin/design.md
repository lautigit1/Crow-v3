# Design: product-cost-margin

## Backend

- `models/product.py`: columnas `cost_price` (`Numeric(12,2)`, nullable)
  y `margin_pct` (`Numeric(6,2)`, nullable). Comentario explícito de que
  son solo para uso admin.
- Migración `010_product_cost_margin.py`: agrega ambas columnas.
- `schemas/product.py`:
  - `ProductCreate`/`ProductUpdate` ganan `cost_price`/`margin_pct`
    (escritura -- ya están protegidos porque `create_product`/
    `update_product` exigen `AdminUser`).
  - `ProductRead` también declara ambos campos (nullable, default
    `None`) -- así el mismo schema sirve para respuesta pública y
    admin. El valor real solo se completa condicionalmente en el
    endpoint (ver abajo), nunca por default en el schema.

## Ocultar costo de visitantes públicos

Problema: `GET /products` y `GET /products/{id}` son públicos (usados
por el catálogo Y por el panel de admin -- no hay endpoints separados
para admin). Si `ProductRead` simplemente reflejara las columnas de la
DB, cualquier visitante vería el costo/margen de cada producto.

Solución: nueva dependencia `get_optional_admin` /
`OptionalAdmin` en `core/deps.py` -- igual que `get_current_user`, pero
nunca lanza excepción: devuelve `None` si no hay cookie de sesión, el
token es inválido, o el usuario no es admin. Se inyecta en
`list_products` y `get_product` (ambos públicos).

Un helper `_serialize_product(product, admin)` en `routes/products.py`
arma el `ProductRead` con `model_validate()` y, si `admin is None`,
pisa `cost_price`/`margin_pct` con `None` antes de devolver --
sin importar lo que haya en la fila. `create_product`, `update_product`,
`restore_product` y `list_deleted_products` (los cuatro ya exigen
`AdminUser`, no opcional) usan el mismo helper pasando el admin real,
así que siempre devuelven los valores reales.

Como el admin panel llama a los mismos endpoints públicos con
`withCredentials: true` (la cookie de sesión viaja igual), el panel de
admin ve los valores reales sin necesitar un endpoint separado --
cualquier visitante sin esa cookie (o con cookie de un usuario no admin)
siempre recibe `null` en esos dos campos, aunque el campo exista en el
schema/OpenAPI.

## Frontend

- `entities/product/index.ts`: `Product`/`ProductInput` ganan
  `cost_price?`/`margin_pct?` (opcionales porque el público los recibe
  en `null`/ausentes).
- `AdminProductsPage.tsx`:
  - Form: fila nueva con "Precio de costo", "Margen (%)" y "Precio de
    venta" (antes solo estaba precio). Tres handlers dedicados
    (`setCostPrice`, `setMarginPct`, `setPriceManual`) en vez del `set`
    genérico para estos tres campos:
    - `setCostPrice`/`setMarginPct`: si están los dos, recalculan
      `price = round2(costo * (1 + margen/100))`.
    - `setPriceManual`: si hay costo cargado, recalcula
      `margin_pct = round2(((precio - costo) / costo) * 100)`.
  - `openEdit` precarga `cost_price`/`margin_pct` desde el producto.
  - Drawer de detalle: bloque con Costo / Margen / Ganancia (`precio -
    costo`), visible solo si el producto tiene costo cargado.
