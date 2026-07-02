# Apply: my-orders-page

## Archivos modificados — Backend

- `app/api/routes/orders.py` — nuevo endpoint `PATCH /orders/me/{id}/cancel`:
  403 si el pedido no pertenece al usuario, 409 si el status no es `Pendiente`

## Archivos modificados — Frontend

- `frontend/src/entities/order/index.ts` — `orderApi.cancelMine(id)` agregado
- `frontend/src/pages/account/MyOrdersPage.tsx` — refactor completo:
  - `OrderDetail` custom → `<Drawer>` (animación slideInRight, header oscuro, footer)
  - `CreateOrderModal` custom → `<Modal>` (header oscuro, blur backdrop)
  - Paginación custom → `<Pagination>`
  - Cancelación → `<ConfirmModal>` antes de confirmar; actualiza drawer y refresca lista
  - `React.CSSProperties` → `import type { CSSProperties } from "react"`
  - Hover en `OrderCard` con border primario y box-shadow
  - Precio unitario visible en detalle de ítem (`formatPrice` c/u)
  - Total estimado destacado con fondo `primarySoft` al pie del drawer

## Desviaciones del plan

- El estado del drawer se actualiza optimistamente con el `Order` devuelto por
  `cancelMine()` sin necesitar refetch individual del pedido.
- Se agregó hover en `OrderCard` (border + shadow) que no estaba en el diseño
  original pero es consistente con el resto de cards de la app.
