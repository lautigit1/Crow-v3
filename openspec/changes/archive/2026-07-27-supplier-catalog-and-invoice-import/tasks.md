# Tasks: supplier-catalog-and-invoice-import

Las fases están ordenadas para que **cada una deje el sistema en un estado usable**. Ninguna depende de que la siguiente esté terminada, y se pueden mergear por separado.

## Fase 1 — Estado de publicación (independiente, sin dependencias)

- [x] **T1** — Migración `013_product_is_active`: columna `is_active` con índice, `server_default=true` **y backfill explícito**. Verificar contra una copia de la base de producción antes de mergear — si las filas existentes quedan en `false`, desaparece el catálogo.
- [x] **T2** — `PRODUCTO_PUBLICO` como predicado único junto al modelo `Product`.
- [x] **T3** — Aplicarlo en los cinco lugares de visibilidad pública: `products.py:58` (listado), `products.py:128` (detalle), `seo.py:84` (sitemap), `favorites.py:25`, `orders.py:106`.
- [x] **T4** — Dejar `dashboard.py:82,118` **sin** el filtro, con comentario explicando que es deliberado (métricas de admin cuentan todo).
- [x] **T5** — `is_active` en `ProductRead` / `ProductInput` y en el tipo `Product` del frontend.
- [x] **T6** — Filtros `supplier_id` e `is_active` en `GET /products`.
- [x] **T7** — Toggle "En catálogo / Fuera del catálogo" en la tabla de `AdminProductsPage`, más filtro por estado.
- [x] **T8** — Tests backend: un producto en borrador no aparece en listado, detalle (404), sitemap, y no se puede favoritear ni pedir; sí aparece en las métricas del dashboard.

## Fase 2 — Activación en lote por proveedor

- [x] **T9** — `PATCH /products/bulk` con `{ids, is_active}` + `audit.record`.
- [x] **T10** — Ensanchar el `Drawer` de proveedores a ~800px y partirlo en pestañas Datos / Productos.
- [x] **T11** — Pestaña Productos: listado con buscador, interruptor por fila y barra de selección múltiple.
- [x] **T12** — Tests: bulk respeta permisos de admin, ignora ids inexistentes, registra auditoría.

## Fase 3 — Movimientos de stock (independiente de 1 y 2)

- [x] **T13** — Migración `014_stock_movements`: tabla con `product_id`, `delta`, `stock_after`, `reason`, `note`, `order_id`, `actor_id`, `created_at`.
      Desvío del plan: `import_batch_id` NO se incluyó — es una FK a `import_batches`, que recién se crea en la fase 4. Se agrega en la migración 015 junto con esa tabla.
      Se sumó `stock_after`, que no estaba planeado: guarda el stock resultante de cada movimiento. Es redundante con la suma de deltas, y esa redundancia permite detectar si alguien tocó `products.stock` por fuera del mecanismo.
- [x] **T14** — Escribir un movimiento en cada cambio de stock que ya existe hoy (edición manual en Inventario, descuento por pedido).
- [x] **T15** — Historial de movimientos visible en el detalle del producto.
- [x] **T16** — Tests: el stock del producto siempre coincide con la suma de sus movimientos.

## Fase 4 — Importación desde Excel

- [x] **T17** — `openpyxl` en `requirements.txt`.
- [x] **T18** — Migración `015_import_batches`: tablas `import_batches` e `import_lines`.
- [x] **T19** — `POST /suppliers/{id}/imports` — sube el archivo, parsea y devuelve el lote en estado borrador con las líneas y sus estados de SKU.
- [x] **T20** — Resolución de SKU según la tabla de `design.md`: mismo proveedor = reposición silenciosa; otro proveedor = fila marcada.
- [x] **T21** — `PATCH /imports/{id}/lines/{line_id}` — editar SKU, cantidad, costo y destino desde la revisión.
- [x] **T22** — `POST /imports/{id}/confirm` — valida que la suma de líneas coincida con el total declarado, crea productos **en borrador**, actualiza costos, genera los movimientos de stock del lote.
- [x] **T23** — `POST /imports/{id}/revert` — movimientos inversos de todo el lote.
- [x] **T24** — Pantalla de revisión en el frontend (`/admin/importaciones`): asistente de subida con mapeo de columnas pre-completado, grilla editable, estados por fila, resolución de conflictos de SKU, y confirmación bloqueada si el total no cuadra.
      La página tiene dos vistas (listado y revisión) sin rutas separadas: revisar es un paso del mismo flujo y partirlo en dos URLs invita a llegar a la revisión sin contexto.
- [x] **T25** — Tests (34, con .xlsx reales generados en memoria): total que no cuadra rechaza la confirmación; importar el mismo archivo dos veces no duplica stock; revertir deja el stock como estaba.

## Fase 5 — Carga asistida de facturas PDF

- [x] **T26** — Visor del documento al lado de la grilla, en la misma pantalla de T24.
      Requirió una migración no planeada (`016_import_file_content`): antes solo se guardaba el nombre del archivo, y para mostrarlo hace falta el archivo. Se guarda en la base (~15 MB/año al volumen estimado) en vez de montar un volumen nuevo; queda además incluido en los backups, que para un comprobante fiscal es una ventaja. El Excel también se guarda ahora.
- [x] **T27** — Alta manual de líneas: `POST /suppliers/{id}/imports/manual` crea el lote vacío, `POST|DELETE /imports/{id}/lines` agregan y quitan. 11 tests nuevos (45 en total en el archivo).
      Sirve para cualquier archivo no parseable, no solo PDF: una foto de un papel entra por el mismo camino.

## Fase 6 — Extracción automática de PDF digitales

- [x] **T28** — `pdfplumber` en `requirements.txt`, `app/core/pdf_import.py` con `tiene_capa_de_texto()` y `extraer_filas()`.
- [x] **T29** — CAMBIO DE ENFOQUE: extracción de tablas con `pdfplumber`, **sin IA**.
      El plan original era mandar el texto a un modelo. Se hizo primero la versión local porque es determinística, gratis, no necesita clave de API y **el archivo no sale del servidor** — con lo cual no depende de D2, que sigue sin responder.
      Reusa `mapear_filas()` de `excel_import.py`, así que la coerción de números ("1.234,56") y la detección de encabezados son literalmente el mismo código para los dos orígenes.
      La opción de IA queda para medir después: si con facturas reales la extracción local falla seguido, ahí se evalúa si vale el costo y el envío de datos a un tercero.
- [x] **T30** — `import_lines.is_auto` (migración `017`), ícono por fila y aviso arriba de la grilla.
- [x] **T31** — `extraer_filas()` nunca lanza: escaneo, maqueta rara o archivo corrupto devuelven lista vacía y el lote se carga a mano. 15 tests, con PDF reales generados con reportlab.

## Decisiones abiertas (hay que resolverlas antes de la fase que las necesita)

- [x] **D1** — RESUELTO: mapeo de columnas al subir, **con memoria por proveedor**. El mapeo se guarda en `suppliers.column_mapping` la primera vez y se aplica solo en las siguientes.
      Se descartó la plantilla fija porque el copiar-y-pegar del Excel del proveedor a la plantilla es justamente el trabajo que la feature viene a ahorrar, y es donde se cuelan desalineaciones de fila invisibles.
      No contradice el rechazo de plantillas para PDF (ver design.md): una plantilla de PDF es geometría y falla en silencio cuando cambia la maqueta; un mapeo de Excel es semántico ("la columna `Código` es el SKU") y cuando los encabezados cambian no matchea y avisa.
- [ ] **D2** *(ya no bloquea nada — la fase 6 se resolvió sin IA)* — Confirmar que está bien que las facturas salgan del servidor hacia un proveedor de IA. Contienen precios de costo y datos de proveedores. Decisión de negocio.
- [ ] **D3** *(durante fase 2)* — Confirmar si el `Drawer` a 800px alcanza o conviene mudarse a `/admin/proveedores/:id`. Se decide viéndolo, no antes.

## Verificación (cada fase)

- [x] `ruff check .` limpio y **363 tests** de backend en verde (corridos en el contenedor, con `REDIS_URL` vacío para forzar el fallback en memoria).
- [x] `typecheck`, `lint` (0 errores) y **96 tests** de vitest en verde.
      `npm run typecheck` detectó fixtures sin `is_active`, y el test de borrado de AdminProductsPage detectó que la columna Catálogo nueva rompía un selector por descarte. Los dos arreglados.
- [x] E2E: **15 tests** en verde contra el stack real.
      Cinco fallos del spec nuevo fueron localizadores mal asumidos (el asterisco de obligatorio forma parte del texto de la etiqueta; el botón de guardar del Modal vive fuera del `<form>`; hay dos botones "Nueva importación" con la lista vacía). Ninguno era un bug del producto.
      NOTA OPERATIVA: correr los E2E varias veces seguidas agota el tope de 10 registros por hora por IP y los tests de compra empiezan a fallar con 429. Entre corridas: `docker compose restart redis`.
