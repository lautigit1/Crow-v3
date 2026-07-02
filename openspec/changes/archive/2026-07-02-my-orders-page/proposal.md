# Proposal: my-orders-page

## What

Refactorizar `MyOrdersPage` para usar los componentes compartidos del design
system (`Drawer`, `Modal`, `Pagination`) y agregar la capacidad de cancelar
un pedido pendiente desde el lado del usuario.

## Why

La página fue implementada rápido y reimplementa tres componentes compartidos
de forma inline:

| Componente reimplementado | Componente existente que debería usar |
|---|---|
| `OrderDetail` (backdrop + panel custom) | `<Drawer>` |
| `CreateOrderModal` (backdrop + caja custom) | `<Modal>` |
| Botones prev/next custom | `<Pagination>` |

Consecuencias:
- `OrderDetail` no tiene la animación `slideInRight`, ni el header oscuro con
  gradiente que tienen todos los drawers del sistema.
- `CreateOrderModal` no tiene el header oscuro ni el blur del backdrop que
  tiene `<Modal>`.
- La paginación tiene estilos ad-hoc que no coinciden con el componente
  `<Pagination>` usado en el resto del admin.
- `React.CSSProperties` se referencia sin importar el namespace `React`
  (error de TypeScript silencioso).
- Los usuarios no tienen forma de cancelar un pedido Pendiente; solo el admin
  puede cambiar estados vía `PATCH /orders/{id}`.

## Success criteria

- `OrderDetail` usa `<Drawer>` del sistema.
- `CreateOrderModal` usa `<Modal>` del sistema.
- La paginación usa `<Pagination>` del sistema.
- El usuario puede cancelar un pedido con status `Pendiente` desde el drawer
  de detalle (con confirmación via `<ConfirmModal>`).
- Backend expone `PATCH /orders/me/{id}/cancel` — solo cancela si el pedido
  pertenece al usuario y está en estado `Pendiente`.
- Sin breaking changes en los endpoints existentes.
- Sin regresiones en el flujo de crear pedido.

## Non-goals

- Editar ítems de un pedido existente.
- Seguimiento de envío / número de tracking.
- Notificaciones push o email al cancelar.
