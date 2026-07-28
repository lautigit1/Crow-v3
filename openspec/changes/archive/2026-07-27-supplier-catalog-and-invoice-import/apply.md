# Apply: supplier-catalog-and-invoice-import

## Resumen

Cierra el circuito que va de la factura del proveedor al catálogo público, con un freno explícito en el medio: **factura → revisión → productos en borrador → se completan → se activan**. Nada llega al sitio sin que alguien lo mire.

Pedido del usuario: poder ver los productos de cada proveedor desde el panel y "meter al catálogo los que quiera, en vivo"; después, importar las listas que mandan los proveedores en Excel y PDF de facturas.

Las seis fases del plan se implementaron completas.

## Migraciones

Seis, todas nuevas. Tres no estaban previstas en el plan y están justificadas en `design.md` §6.

- **`013_product_is_active`** — separa "cargado" de "publicado". `server_default=true` **más** UPDATE explícito: sin el backfill, al deployar desaparece el catálogo entero.
- **`014_stock_movements`** — historial de por qué cambió el stock. Suma `stock_after`, que no estaba planeado; `import_batch_id` quedó afuera (FK a una tabla que todavía no existía) y entra en la 015.
- **`015_import_batches`** — `import_batches` + `import_lines`, la FK pendiente de la 014, y `suppliers.column_mapping` (memoria del mapeo por proveedor).
- **`016_import_file_content`** — guarda el archivo original para mostrarlo al lado de la grilla.
- **`017_import_line_auto`** — marca las líneas que salieron de una extracción automática.
- **`018_import_file_hash`** — SHA-256 para avisar que una factura ya se importó.

## Archivos

**Backend — nuevos:**
- `app/models/stock_movement.py`, `app/models/import_batch.py`
- `app/core/stock.py` — punto único de cambio de stock
- `app/core/excel_import.py` — parser de Excel y `mapear_filas()` compartido
- `app/core/pdf_import.py` — extracción de tablas de PDF con `pdfplumber`
- `app/schemas/import_batch.py`, `app/api/routes/imports.py`
- `docker-entrypoint.sh` — Alembic ahora corre también en desarrollo
- `tests/test_product_visibility.py` (19), `test_stock_movements.py` (16), `test_imports.py` (53), `test_pdf_import.py` (15)

**Backend — modificados:** `models/product.py` (`is_active` + `producto_publico()`), `routes/products.py` (filtros, `PATCH /bulk`, historial, movimientos en alta y ajuste), `routes/orders.py` (movimientos en venta y cancelación), `routes/favorites.py`, `routes/seo.py`, `models/supplier.py`, `schemas/product.py`, `api/__init__.py`, `models/__init__.py`, `scripts/verify_db_integrity.py`, `Dockerfile`, `requirements.txt`, `requirements-dev.txt`, `tests/conftest.py`.

**Frontend — nuevos:** `entities/import/`, `pages/admin/AdminImportsPage.tsx`, `pages/admin/ui/ImportReviewGrid.tsx`, `ui/StockHistory.tsx`, `ui/SupplierProductsPanel.tsx`, `__tests__/ImportReviewGrid.test.tsx` (13), `e2e/admin-imports.spec.ts` (3).

**Frontend — modificados:** `entities/product/index.ts`, `AdminProductsPage.tsx`, `AdminSuppliersPage.tsx`, `AdminLayout.tsx`, `app/App.tsx`, y los fixtures de `AdminProductsPage.test.tsx` / `CartProvider.test.tsx`.

**Raíz:** `.gitattributes`.

## Decisiones documentadas

- **Un solo predicado de visibilidad.** `producto_publico()` vive junto al modelo y lo consumen los cinco endpoints públicos. `dashboard.py` queda deliberadamente afuera: son métricas de administración y el admin quiere contar todo.
- **Una factura no es una lista de precios.** Trae cantidad y costo, así que importarla es dar entrada de mercadería, no traer un catálogo. Eso resolvió solo el problema de importar productos con stock 0 que nadie puede comprar.
- **Los productos importados entran siempre en borrador.** No es configurable: una factura no trae precio de venta.
- **El control cruzado es innegociable.** Si la suma de las líneas no da el total declarado, no se confirma. Es lo que vuelve seguro un parseo falible.
- **D1 — mapeo con memoria por proveedor**, no plantilla fija. La plantilla obligaría a copiar y pegar el Excel del proveedor, que es justo el trabajo que la feature viene a ahorrar.
- **Fase 6 sin IA.** Se hizo primero la extracción local con `pdfplumber`: determinística, gratis, y el archivo no sale del servidor. La opción de IA queda para medir con facturas reales, no para decidir de antemano.
- **Escaneados: no se hace OCR.** ~30 facturas/mes × 4 min de carga asistida son 2 horas mensuales, contra semanas de trabajo más mantenimiento permanente — y el OCR falla justo en los dígitos.
- **Alembic en los dos entornos.** Antes las migraciones solo corrían en producción, así que una migración rota se estrenaba ahí. Ahora cada `docker compose up` las ejerce.

## Verificación

- **Backend:** `ruff check .` limpio, **363 tests** en verde (corridos en el contenedor con `REDIS_URL` vacío).
- **Frontend:** `typecheck` limpio, `lint` 0 errores, `vitest run` **96 tests**, `steiger` sin problemas.
- **E2E:** **15 tests** en verde contra el stack real, incluido el flujo completo de importación.

## Lo que encontraron los tests

Vale registrarlo porque justifica el costo de escribirlos:

- `npm run typecheck` detectó fixtures sin `is_active` — el CI de frontend habría fallado.
- El test de borrado de `AdminProductsPage` detectó que la columna Catálogo nueva rompía un selector que buscaba "el botón que no dice editar".
- La suite de backend **cambiaba de resultado según si había un Redis alcanzable**: la limpieza entre tests solo tocaba el estado en memoria. Se forzó `REDIS_URL=""` en `conftest.py`.
- Los E2E encontraron cinco localizadores mal asumidos en el spec nuevo (el asterisco de obligatorio es parte del texto de la etiqueta; el botón de guardar del Modal vive fuera del `<form>`; hay dos botones "Nueva importación" con la lista vacía). Ninguno era un bug del producto, pero todos habrían roto el CI.

## Pendiente / limitaciones

- **D2** sin responder: si las facturas pueden salir hacia un proveedor de IA. Ya no bloquea nada — la fase 6 se resolvió local.
- **D3** sin confirmar: si el `Drawer` a 820px alcanza para los productos del proveedor o conviene una página propia. Se decide usándolo.
- **La detección de duplicados es exacta sobre los bytes.** Si el proveedor reexporta el mismo comprobante, el hash cambia y no lo detecta; para eso queda el control del total.
- **Nota operativa:** correr los E2E varias veces seguidas agota el tope de 10 registros por hora por IP y los tests de compra empiezan a fallar con 429. Entre corridas, `docker compose restart redis`. En CI no pasa porque cada corrida arranca limpia.
- **El historial de stock arranca vacío** para los productos anteriores a la migración 014: esos movimientos nunca se registraron y no hay forma de reconstruirlos. Por eso cada movimiento guarda `stock_after` en vez de depender de la suma de deltas.
