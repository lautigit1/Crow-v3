# Design: supplier-catalog-and-invoice-import

## 1. Estado de publicación: `products.is_active`

Columna nueva `is_active: bool` en `products`, con índice (el catálogo público filtra por ella en cada request).

**La migración es el punto más peligroso de todo el cambio.** El `server_default` tiene que ser `true` y además hay que hacer backfill explícito de las filas existentes. Si los productos ya cargados quedan en `false`, al deployar **desaparece el catálogo entero**. Se verifica contra una copia de la base antes de mergear.

### Nomenclatura

En la base va `is_active`, que es el vocabulario que ya usan `Supplier` y `User`. En la interfaz **no** se muestra como "Activo": `Supplier.is_active` significa otra cosa (un proveedor con el que se sigue trabajando) y "activo" en un producto se confunde con "tiene stock". La UI dice **En catálogo / Fuera del catálogo**.

### Un solo predicado para la visibilidad pública

Hoy la visibilidad se decide con `Product.is_deleted.is_(False)` repetido en cada endpoint. Sumar una segunda condición multiplica las oportunidades de olvidarse una. Se define **una sola vez**, junto al modelo:

```python
# app/models/product.py
PRODUCTO_PUBLICO = and_(Product.is_deleted.is_(False), Product.is_active.is_(True))
```

Hay precedente en el repo: `crud/base.py` ya encapsula el filtro de borrado en `_not_deleted()`.

Los lugares que deben usarlo (relevados uno por uno):

| Archivo | Qué pasa si se olvida |
|---|---|
| `products.py:58` — listado público | El borrador aparece en el catálogo |
| `products.py:128` — detalle | Entra por URL directa aunque no esté listado |
| `seo.py:84` — sitemap | Google indexa un producto que no se vende |
| `favorites.py:25` — alta de favorito | Se puede favoritear un borrador |
| `orders.py:106` — validación de ítems | Se puede pedir un borrador |

**`dashboard.py:82,118` queda deliberadamente afuera.** Son métricas de administración: el admin quiere contar todo lo que tiene cargado, no solo lo publicado. Es la excepción, y está anotada como tal para que nadie la "arregle" después.

### Caso borde: carritos en curso

Si se desactiva un producto que un cliente ya tiene en el carrito, la validación de `orders.py` rechaza el pedido con un error poco claro. **Decisión:** el checkout detecta el ítem no disponible y lo avisa explícitamente, en vez de dejar fallar la confirmación entera. Los pedidos ya confirmados no corren riesgo: `OrderItem` guarda `name_snapshot`, `sku_snapshot` y `unit_price_snapshot`.

### Endpoints

- `PATCH /products/bulk` — `{ids: [int], is_active: bool}`. Genérico a propósito: sirve tanto desde el panel del proveedor como desde la tabla de productos.
- `GET /products?supplier_id=&is_active=` — el filtro por proveedor no existe hoy y hace falta igual para responder "qué le compro a este proveedor".

## 2. Movimientos de stock

Tabla nueva `stock_movements`, porque hoy `products.stock` es un entero sin historia:

| Campo | Notas |
|---|---|
| `product_id` FK | `ondelete CASCADE` |
| `delta` int | Positivo entrada, negativo salida |
| `reason` | `compra` \| `ajuste_manual` \| `venta` \| `reversion` |
| `import_batch_id` FK nullable | Agrupa todos los movimientos de una misma factura |
| `note`, `created_at`, `actor_id` | Quién y por qué |

Esto es lo que permite **deshacer una importación completa**: se revierte el lote entero generando movimientos inversos, sin tener que adivinar qué tocó.

## 3. Importación de facturas

### Modelo

`import_batches` guarda cada importación: proveedor, archivo original, total declarado de la factura, estado (`borrador` \| `confirmado` \| `revertido`), y el resumen `{creados, actualizados, salteados}`.

Las líneas parseadas viven en `import_lines` hasta que se confirma el lote. Eso es lo que hace que la pantalla de revisión pueda editarse sin tocar `products`.

### Resolución de SKU

`products.sku` es único global, pero dos proveedores pueden usar el mismo código. **Que un SKU exista no siempre es un conflicto** — depende de a quién pertenece:

| Situación | Interpretación | Qué hace la revisión |
|---|---|---|
| El SKU existe y el producto es **de ese mismo proveedor** | Reposición | Suma stock, actualiza costo. No interrumpe |
| El SKU existe pero es **de otro proveedor** o no tiene proveedor asignado | Ambiguo: puede ser la misma pieza comprada a otro lado, o coincidencia | Marca la fila y pide decisión |
| El SKU no existe | Producto nuevo | Se crea en borrador |

Solo el caso del medio interrumpe, con dos salidas en la misma fila: **vincular** al producto existente, o **editar el SKU** y crear uno nuevo. Decisión explícita del usuario: prefiere resolverlo a mano en la revisión antes que aplicar una regla automática de prefijos, porque las colisiones son poco frecuentes.

### La pantalla de revisión

Es el corazón del cambio y la razón por la que esto es seguro. Muestra las líneas detectadas, cada una con su estado, permite editar SKU, cantidad, costo y destino, y **no deja confirmar si la suma de las líneas no coincide con el total declarado de la factura**.

Ese control cruzado es lo que convierte un parseo falible en un proceso que no puede fallar en silencio: da igual si las líneas vinieron de un Excel, de un PDF o tipeadas a mano, el chequeo es el mismo.

### Los productos entran siempre en borrador

Decisión explícita, no configurable. Una factura trae costo, no precio de venta: activar en el momento publicaría productos en "Consultar". El camino previsto es importar, revisar precios, y activar en lote — que es exactamente para lo que existe la fase 2.

## 4. Por qué el PDF se resuelve así

Contexto relevado con el usuario: **6-15 proveedores**, PDFs **digitales y escaneados** mezclados.

### Plantillas por proveedor: descartadas

Serían 6-15 plantillas. El problema no es escribirlas, es que cuando un proveedor cambia su maqueta la plantilla **falla en silencio**: sigue extrayendo, extrae mal, y el error aparece cuando el stock no cuadra semanas después. Multiplicado por quince, es una fuente permanente de bugs difíciles de rastrear.

### Escaneados: no se parsean

La cuenta, con números del propio negocio: ~30 facturas/mes × ~4 minutos de carga asistida = **~2 horas mensuales**. Contra eso, OCR confiable implica Tesseract en la imagen de Docker, preprocesado de imagen, y un goteo permanente de casos que fallan — semanas de trabajo más mantenimiento indefinido. Y el resultado sería **peor**: el OCR se equivoca precisamente en los dígitos, que es donde no se puede fallar.

Para escaneados, entonces, la carga es manual con el PDF mostrado al lado y el total como control cruzado. Aburrido, pero infalible y de riesgo cero.

### Digitales: extracción local con `pdfplumber`, sin IA

> **Corregido durante la implementación.** El plan original decía "extracción con IA": mandar el texto del PDF a un modelo y que devolviera las líneas en JSON. Se hizo primero la versión **local** y alcanzó, así que la IA nunca se implementó.

`pdfplumber` reconstruye las tablas del PDF a partir de sus líneas de dibujo y la posición del texto. Es determinístico, gratis, no necesita clave de API y **el archivo no sale del servidor**, con lo cual la decisión D2 deja de bloquear nada.

`app/core/pdf_import.py` expone dos funciones: `tiene_capa_de_texto()` distingue un PDF digital de un escaneo, y `extraer_filas()` devuelve las líneas. La segunda **nunca lanza**: un escaneo, una maqueta rara o un archivo corrupto devuelven lista vacía y el lote se carga a mano. Perder la extracción es un inconveniente; romper la subida dejaría al usuario sin forma de cargar la factura.

Reusa `mapear_filas()` de `excel_import.py`, así que la coerción de números (`"1.234,56"`) y la detección de encabezados son **literalmente el mismo código** para los dos orígenes. Si cada uno tuviera su propia lógica, tarde o temprano divergirían y un mismo número se leería distinto según de dónde viniera.

**La opción de IA queda para medir, no descartada.** Si con facturas reales la extracción local falla seguido con algún proveedor, ahí se evalúa si compensa el costo por factura y el envío de datos a un tercero. Decidirlo con datos es más barato que decidirlo antes.

## 5. Dónde vive la UI

En el `Drawer` de proveedores que ya existe, según preferencia explícita del usuario. **Advertencia registrada:** el `Drawer` mide 460px por defecto y una tabla con checkbox, nombre, SKU, costo y acción no entra cómoda. Hay que llevarlo a ~800 (`width` ya es una prop numérica). Aun así va a quedar ajustado; si en la práctica molesta, la alternativa es una página propia `/admin/proveedores/:id` y el contenido se muda casi sin cambios.

Dos pestañas: **Datos** (lo que ya hay) y **Productos** (listado con buscador, interruptor por fila y barra de selección múltiple para el lote).

## 6. Migraciones que no estaban en el plan

Tres aparecieron durante la implementación. Se documentan acá porque las tres responden a algo que no se había previsto al planificar:

**`016_import_file_content`** — Se guardaba solo el nombre del archivo, y para mostrar el PDF al lado de la grilla (fase 5) hace falta el archivo. Va **en la base** y no en un volumen: una factura pesa 100-500 KB y llegan unas 30 por mes, o sea ~15 MB al año, que para Postgres no es nada. Evita montar y sincronizar un volumen entre dev y producción, y hace que los backups incluyan los comprobantes — que para un documento fiscal es más ventaja que costo. Cloudinary quedó descartado por otro motivo: son documentos con precios de costo, no imágenes públicas. El endpoint los sirve con `no-store` y solo para admin. Si el volumen creciera de verdad, mover esto a almacenamiento externo es un cambio contenido: la columna se lee desde un solo endpoint.

**`017_import_line_auto`** — Una línea leída por una máquina y una tipeada por una persona no merecen la misma confianza. `is_auto` permite marcarlas en la revisión para que la atención se concentre donde puede haber errores de lectura.

**`018_import_file_hash`** — SHA-256 del archivo, para avisar que esa factura ya se importó **antes** de procesarla. El frontend calcula el hash con `crypto.subtle` y consulta; así el aviso llega antes de crear nada. Es detección exacta sobre los bytes: si el proveedor reexporta el mismo comprobante, el hash cambia y no lo detecta — para eso queda el control del total. La búsqueda es global y no por proveedor, porque el mismo archivo cargado contra dos proveedores distintos también es un error, y de los más difíciles de notar.

## 7. Dependencias nuevas

- `openpyxl` — lectura de Excel (fase 4).
- `pdfplumber` — extracción de tablas de PDF digitales (fase 6).
- `reportlab` — **solo en `requirements-dev.txt`**: genera los PDF con tablas reales que usan los tests. No se usa en runtime; el backend lee PDF, no los genera.

**Tesseract queda afuera**, que era el que obligaba a tocar la imagen de Docker.
