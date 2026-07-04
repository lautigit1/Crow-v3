# Proposal: admin-modals-wider

## What

Agrandar el ancho de los modales de creación/edición del panel de
admin (Producto, Proveedor, Usuario, Categoría, Marca).

## Why

Los modales se sentían chicos para la cantidad de campos que tienen
(especialmente Producto, que ahora suma costo/margen/precio). Pedido
directo del usuario: "agranda todos los modales de edición/creación de
algo, ya sea marca, producto o lo que sea".

## Alcance

Solo cambia el prop `width` del componente `Modal` en cada página de
admin. No se tocó el layout interno de los formularios (siguen en la
misma grilla de columnas de antes) ni otros modales que no son de
alta/edición de una entidad (`ConfirmModal`, `QuoteModal`, el modal de
"Nuevo pedido" en Mis Pedidos).

| Modal      | Antes | Ahora |
|------------|-------|-------|
| Producto   | 600   | 760   |
| Proveedor  | 520   | 640   |
| Usuario    | 480   | 600   |
| Categoría  | 440   | 560   |
| Marca      | 440   | 560   |

## Non-goals

- No se reflowan a columnas los formularios de Categoría/Marca (son de
  una sola columna) -- si el ancho extra deja mucho espacio vacío,
  queda para un ajuste aparte.
