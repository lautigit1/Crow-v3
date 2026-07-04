# Apply: checkout-payment-stock-gate

## Archivos tocados

Backend:
- `app/models/order.py` — enum `PaymentMethod` + columna `payment_method` (nullable).
- `alembic/versions/009_order_payment_method.py` — migración nueva.
- `app/schemas/order.py` — `OrderCreate`/`OrderRead` con `payment_method`.
- `app/api/routes/orders.py` — `create_order` persiste `payment_method`.

Frontend:
- `entities/order/index.ts` — tipo `PaymentMethod`, `PAYMENT_METHODS`, `PAYMENT_METHOD_HINT`, `Order`/`OrderCreate` actualizados.
- `pages/checkout/CheckoutPage.tsx` — `PaymentMethodPicker`, validación requerida, envío en el payload, texto de éxito.
- `pages/account/MyOrdersPage.tsx` — muestra el método de pago en el detalle del pedido si existe.
- `app/providers/CartProvider.tsx` — `addItem` bloquea `stock <= 0`; `mergeItems` con cap ajustado.
- `pages/product/ProductDetailPage.tsx` — sin stock: oculta stepper/botones de compra, muestra botón deshabilitado + sugerencia de WhatsApp, badge "Sin stock".
- `entities/product/ProductCard.tsx` — badge "Sin stock" (antes "Bajo pedido").
- `pages/cart/CartPage.tsx` — tope del stepper `Math.max(stock, cantidad actual)`.

## Por qué no se tocó el modal de "Nuevo pedido" (MyOrdersPage)

Ese modal busca productos con `in_stock: false` a propósito -- permite
pedir algo sin stock actual como pedido especial coordinado con el
equipo. Es un flujo distinto del carrito/checkout, así que no se le
agregó selector de pago ni bloqueo de stock. El campo `payment_method`
es `nullable` justamente para que ese modal siga funcionando sin
cambios (crea pedidos con `payment_method = null`).

## Por qué no hay validación de stock en el backend

Si se agregara un chequeo estricto de stock en `POST /api/orders`,
rompería ese mismo modal (que permite productos sin stock). Se decidió
dejar el stock gate solo del lado del carrito/ficha de producto, que es
lo que pidió el usuario ("que no me deje meter al carrito"). Validación
de stock a nivel de pedido queda como mejora futura si se quiere separar
ambos flujos con más cuidado.

## Mercado Pago

Aparece como una opción más en el selector de método de pago, sin
ninguna integración real -- ni credenciales, ni preferencias de pago,
ni webhooks. El pedido se crea igual que con transferencia/efectivo
(`Pendiente`, coordinación manual después). Esto fue una decisión
explícita del usuario para esta iteración.

## Verificación

Sandbox sin acceso a red -- no se pudo correr `tsc`/build. Verificación
manual: relectura completa de los 11 archivos tocados, confirmando
tipos, imports y que no quedaron referencias rotas (p. ej. `Badge tone`
sigue usando valores válidos, `Math.max` en los caps de cantidad no
rompe los steppers existentes).
