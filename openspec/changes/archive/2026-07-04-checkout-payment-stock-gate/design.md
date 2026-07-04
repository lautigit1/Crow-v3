# Design: checkout-payment-stock-gate

## Backend

- `models/order.py`: nuevo enum `PaymentMethod` (`Transferencia`,
  `Mercado Pago`, `Tarjeta`, `Retiro en local (efectivo)`) y columna
  `Order.payment_method` (`nullable=True` -- pedidos creados por el
  modal de "Nuevo pedido" en Mis Pedidos no lo envían).
- Migración `009_order_payment_method.py`: agrega el tipo enum
  `paymentmethod` y la columna a `orders`.
- `schemas/order.py`: `OrderCreate.payment_method: PaymentMethod | None
  = None`, `OrderRead.payment_method: PaymentMethod | None`.
- `routes/orders.py`: `create_order` pasa `payment_method=payload.payment_method`
  al crear el `Order`. Sin validación de stock en este endpoint (ver
  Non-goals) para no romper el modal de "Nuevo pedido", que permite
  pedir productos sin stock a propósito.

## Frontend -- método de pago

- `entities/order/index.ts`: tipo `PaymentMethod`, arrays
  `PAYMENT_METHODS` y `PAYMENT_METHOD_HINT` (texto corto por método,
  mostrado bajo la selección), `payment_method` agregado a `Order` y
  `OrderCreate`.
- `CheckoutPage.tsx`: nuevo componente `PaymentMethodPicker` (grilla
  2x2 de botones seleccionables, mismo lenguaje visual que el resto del
  checkout). `handleConfirm` valida que haya un método elegido antes de
  llamar a `orderApi.create` (si no, error inline, sin pegarle al
  backend). El botón "Confirmar pedido" queda deshabilitado hasta
  elegir uno. La pantalla de éxito menciona el método elegido.
- `MyOrdersPage.tsx` (`OrderDetailBody`): muestra el método de pago del
  pedido si existe (pedidos viejos o creados por el modal manual no lo
  tienen -- no se muestra nada en ese caso).

## Frontend -- stock gate

- `CartProvider.addItem`: retorna sin hacer nada si
  `product.stock <= 0`. El cap de cantidad ya no usa `Infinity` como
  fallback para stock 0 -- directamente `product.stock`.
- `mergeItems` (reconciliación login/logout del carrito): cap ajustado
  a `Math.max(item.stock, cantidad ya mergeada)` para no truncar
  cantidades ya presentes por snapshots de stock viejos.
- `ProductDetailPage.tsx`: si `!inStock`, no se muestra el stepper ni
  los botones de compra -- se reemplazan por un botón deshabilitado
  ("Sin stock disponible") y una sugerencia de consultar por WhatsApp.
  El badge de stock pasa de "Bajo pedido" (warning) a "Sin stock"
  (danger), alineado con cómo ya lo trata el panel de admin
  (`AdminInventoryPage`, `DashboardPage`).
- `ProductCard.tsx` (catálogo): mismo cambio de badge por consistencia
  (esta card no tiene botón de compra directa, solo Cotizar/WhatsApp).
- `CartPage.tsx`: el tope del stepper de cantidad pasa de
  `stock > 0 ? stock : 99` a `Math.max(stock, cantidad actual)` -- por
  si queda un item viejo en el carrito de alguien con stock 0 (de antes
  de este cambio), se puede seguir viendo/quitando pero no aumentar.

## Qué no se toca

- El modal de "Nuevo pedido" de `MyOrdersPage.tsx` sigue permitiendo
  buscar y pedir productos sin stock (`in_stock: false`) y no pide
  método de pago -- es un pedido especial/manual, no pasa por el
  carrito.
- No hay validación de stock en el backend al crear el pedido todavía
  (ver Non-goals en `proposal.md`).
