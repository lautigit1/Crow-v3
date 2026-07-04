# Tasks: checkout-payment-stock-gate

- [x] T1 — Backend: `PaymentMethod` enum + columna `Order.payment_method` (modelo).
- [x] T2 — Backend: migración `009_order_payment_method.py`.
- [x] T3 — Backend: `OrderCreate`/`OrderRead` con `payment_method`; `create_order` lo persiste.
- [x] T4 — Frontend: `entities/order` con `PaymentMethod`, `PAYMENT_METHODS`, `PAYMENT_METHOD_HINT`.
- [x] T5 — Frontend: `CheckoutPage` — selector de método de pago, validación, envío en el payload, mensaje de éxito.
- [x] T6 — Frontend: `MyOrdersPage` — mostrar método de pago en el detalle del pedido.
- [x] T7 — Frontend: `CartProvider.addItem` bloquea productos con `stock <= 0`; ajuste de caps en `mergeItems`.
- [x] T8 — Frontend: `ProductDetailPage` — ocultar compra directa sin stock, badge "Sin stock".
- [x] T9 — Frontend: `ProductCard` — badge "Sin stock" (consistencia con catálogo/admin).
- [x] T10 — Frontend: `CartPage` — tope del stepper ajustado para items viejos con stock 0.
- [x] T11 — Verificación manual (sin `tsc`/build en el sandbox): relectura completa de todos los archivos tocados.
