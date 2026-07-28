# Proposal: supplier-catalog-and-invoice-import

## What

Cerrar el circuito que va de la factura del proveedor al catálogo público del sitio, con un freno explícito en el medio:

```
factura (Excel / PDF)  →  pantalla de revisión  →  productos en borrador  →  se completan  →  se activan
```

Son dos capacidades que se apoyan una en la otra:

1. **Estado de publicación por producto.** Una columna `is_active` en `products` que separa "cargado en el sistema" de "visible en el catálogo". Hoy esa distinción no existe: todo lo que no está borrado (`is_deleted`) se ve. Incluye poder activar/desactivar en lote **todos los productos de un proveedor puntual** desde el panel.

2. **Ingreso de mercadería desde la factura del proveedor.** Importar una factura (Excel primero, PDF después) para dar de alta productos nuevos, actualizar el costo de los existentes y **sumar stock**, siempre pasando por una pantalla de revisión que cruza la suma de las líneas contra el total de la factura.

## Why

- **El pedido original del usuario** fue poder ver los productos de cada proveedor desde el panel de admin y "meter al catálogo los que quiera, en vivo". Eso hoy es imposible por dos razones concretas: no hay estado intermedio entre "existe" y "publicado", y `GET /products` ni siquiera acepta un filtro por `supplier_id`.

- **Importar sin estado de borrador es peligroso.** Un producto se crea con `stock = 0` y `price = NULL`. Si una importación de cincuenta líneas publicara directo, el catálogo quedaría con cincuenta productos que muestran "Consultar" y que **no se pueden agregar al carrito** (el front bloquea el alta sin stock). El borrador no es una comodidad, es lo que hace que importar en volumen sea seguro.

- **Una factura no es una lista de precios, y eso conviene.** Durante el diseño se descartó modelar "el catálogo del proveedor" como una tabla de artículos ofertados. Una factura describe lo que **ya se compró**: trae SKU, descripción, **cantidad** y costo unitario. Eso mapea a algo más útil — entrada de mercadería, no importación de catálogo — y resuelve solo el problema del stock en cero.

- **El stock hoy no tiene historial.** `products.stock` es un entero pelado que la página de Inventario edita a mano. En cuanto una importación automática empiece a moverlo, hace falta saber por qué cambió y poder deshacer una carga equivocada. Sin eso, una factura importada dos veces duplica el stock sin dejar rastro.

## Non-goals

- **No se hace OCR de facturas escaneadas.** Con el volumen estimado (~30 facturas/mes) la carga manual asistida son ~2 horas mensuales; montar OCR confiable son semanas de trabajo más mantenimiento permanente, y falla justamente en los números. Ver `design.md` para el razonamiento completo. Se reevalúa si el volumen crece de forma significativa.

- **No se usan plantillas de parseo por proveedor.** Con 6-15 proveedores serían 6-15 plantillas, y cuando un proveedor cambia su maqueta la plantilla falla **en silencio**: extrae mal y el error se descubre cuando el stock no cuadra.

- **No se sincronizan precios hacia atrás.** Si el proveedor sube el costo en una factura nueva, se actualiza `cost_price`, pero **no** se recalcula el `price` de venta de los productos ya publicados. Cambiar precios de venta sin intervención humana es una decisión comercial, no un efecto secundario de una importación.

- **No se toca el flujo de compra público.** El comprador no ve nada nuevo: solo deja de ver los productos que estén en borrador.

- **No se elimina la edición manual de stock.** La página de Inventario sigue funcionando igual; la importación es una fuente adicional de movimientos, no un reemplazo.

## Success criteria

- Un producto puede sacarse del catálogo sin borrarlo, y vuelve a entrar con un clic. Un producto en borrador **no aparece** en el listado público, ni en el detalle por URL directa, ni en el sitemap, ni se puede favoritear ni pedir.
- Desde el panel del proveedor se pueden activar o desactivar todos sus productos de una sola acción.
- Importar un Excel de factura crea los productos que faltan, actualiza el costo de los que ya existen y suma el stock comprado, dejando registro de cada movimiento.
- La importación **no se puede confirmar** si la suma de las líneas no coincide con el total declarado de la factura.
- Cada fase deja el sistema en un estado usable: ninguna depende de que la siguiente esté terminada.
- `ruff check` + `pytest` (backend) y `tsc` + ESLint + Steiger/FSD + Vitest (frontend) pasan sin regresiones.
