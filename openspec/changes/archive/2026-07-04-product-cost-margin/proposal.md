# Proposal: product-cost-margin

## What

En el formulario de producto (crear/editar) del panel de admin, dos
campos nuevos: precio de costo y margen de ganancia (%). El precio de
venta se calcula solo a partir de esos dos, y también funciona al
revés (si se edita el precio de venta a mano, el margen se recalcula).

## Why

Hoy el precio de venta se cargaba a mano sin ninguna referencia al
costo. El admin pidió poder cargar el costo y un % de margen y que el
precio de venta salga solo de ahí.

## Alcance

- Nuevos campos en `Product`: `cost_price`, `margin_pct`. Ambos
  opcionales -- productos existentes quedan sin valor hasta que se
  editen.
- **Nunca se exponen públicamente.** El catálogo, la ficha de producto
  y cualquier visitante sin sesión de admin reciben `cost_price` y
  `margin_pct` en `null`, sin importar lo que haya cargado en la base.
  Solo un admin logueado (mismo cookie de sesión que ya usa el panel)
  ve los valores reales.
- Cálculo en el form de admin: cargar costo + margen calcula el precio
  de venta; editar el precio de venta a mano recalcula el margen (si
  hay costo cargado). Todo en el cliente, sin llamadas extra al backend.
- Drawer de detalle del admin: muestra costo, margen y ganancia
  (precio - costo) cuando el producto tiene costo cargado.

## Non-goals

- No se agrega un endpoint admin-only separado para listar productos --
  se reusa el mismo `GET /products` público, enriquecido solo cuando
  quien pregunta es admin (ver `design.md`).
- No se recalcula nada de pedidos pasados ni reportes con este cambio.
