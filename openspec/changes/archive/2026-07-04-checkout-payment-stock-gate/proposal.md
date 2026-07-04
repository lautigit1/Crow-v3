# Proposal: checkout-payment-stock-gate

## What

1. En `/checkout`, el cliente elige un método de pago (Transferencia,
   Mercado Pago, Tarjeta, Retiro en local (efectivo)) antes de poder
   confirmar el pedido.
2. Un producto sin stock (`stock <= 0`) ya no se puede agregar al
   carrito ni comprar directo desde la ficha de producto.

## Why

El checkout actual no pedía método de pago (el pedido quedaba
"Pendiente" sin más info), y la ficha de producto permitía agregar al
carrito productos con `stock = 0` bajo un concepto de "Bajo pedido" que
ya no se quiere sostener: si no hay stock, no se puede comprar.

## Alcance

- **Método de pago**: por ahora es solo un dato que el cliente elige al
  confirmar -- no hay cobro online real todavía. "Mercado Pago" queda
  como una opción más de la lista, sin credenciales ni integración
  configurada (a pedido explícito del usuario: "pongamos la opción de
  mp pero sin configurarla aún"). El cobro real se sigue coordinando
  después (WhatsApp, transferencia manual, etc.), igual que hoy.
- **Alcance del cambio de pago**: solo toca el endpoint `POST /api/orders`
  (usado tanto por el nuevo checkout como por el modal de "Nuevo pedido"
  de `Mis Pedidos`). El campo `payment_method` es opcional a nivel de
  columna/schema para no romper ese modal (que no lo envía).
- **Stock gate**: se aplica en el flujo de carrito/ficha de producto
  (`ProductDetailPage`, `CartProvider`). No se toca el modal de "Nuevo
  pedido" de `Mis Pedidos`, que intencionalmente permite pedir productos
  sin stock actual (`in_stock: false` en su búsqueda) como pedido
  especial/bajo pedido coordinado con el equipo -- ese es un flujo
  distinto y no se quiere romper.

## Non-goals

- No se integra Mercado Pago Checkout Pro ni ninguna pasarela de cobro
  real todavía.
- No se descuenta stock automáticamente al crear un pedido (eso queda
  como mejora futura, junto con validación de stock en el backend al
  crear pedido).
