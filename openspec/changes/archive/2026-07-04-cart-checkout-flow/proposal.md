# Proposal: cart-checkout-flow

## What

Agregar un flujo de compra directa desde la ficha de producto: botón
"Agregar al carrito" y "Comprar ahora", una vista de carrito (`/carrito`)
y un checkout (`/checkout`) que confirma el pedido usando el sistema de
`Order` que ya existe en el backend.

## Why

Hoy `POST /api/orders` y el modelo `Order`/`OrderItem` ya existen y
funcionan, pero la única forma de crear un pedido es entrando a
`/cuenta/pedidos` y volviendo a buscar los productos desde cero en un
modal. No hay forma de armar un pedido mientras se navega el catálogo, ni
una opción de "comprarlo ya" desde la ficha del producto.

## Alcance (definido con el usuario)

- **Sin pago online.** El checkout crea un pedido `Pendiente`, igual que
  hoy — el pago se coordina después (WhatsApp, transferencia, efectivo).
  No se integra ningún gateway de pago (Mercado Pago, Stripe, etc.) en
  este change.
- **Carrito para todos.** Cualquier visitante (sin cuenta) puede agregar
  productos al carrito navegando — se persiste en el navegador
  (`localStorage`). Recién al confirmar el pedido en `/checkout` se pide
  login/registro (mismo patrón que ya usa `RequireAuth` con redirect de
  vuelta tras loguearse).

## Non-goals

- No se toca el backend — `Order`/`OrderItem`/`POST /api/orders` ya
  soportan exactamente lo que este change necesita.
- No se reemplaza ni se toca el flujo existente de "Nuevo pedido" dentro
  de `/cuenta/pedidos` — queda como una vía alternativa para armar pedidos
  a mano, sin pasar por el carrito.
- No se agrega botón de carrito en las tarjetas del catálogo
  (`ProductCard`) — el pedido explícito del usuario fue "una opción
  adentro del producto", así que el alcance queda en `ProductDetailPage`.
  Se puede ampliar a las tarjetas en un change futuro si se quiere.
- No se valida stock disponible al confirmar el pedido más allá de lo que
  el backend ya valida (producto existe y no está eliminado) — es
  responsabilidad del admin al procesar el pedido.

## Success criteria

- Desde `/producto/:id` se puede elegir cantidad y agregar el producto al
  carrito, o hacer "Comprar ahora" (agrega + va directo a `/checkout`).
- El carrito persiste entre recargas de página (localStorage) y funciona
  sin estar logueado.
- Hay un ícono de carrito en la navbar (desktop y mobile) con badge de
  cantidad de ítems, que lleva a `/carrito`.
- `/carrito` permite ver los ítems, cambiar cantidades, quitar ítems,
  vaciar el carrito, ver el subtotal, y continuar a `/checkout`.
- `/checkout` pide login si no hay sesión (con redirect de vuelta después
  de loguearse), muestra el resumen del pedido + un campo de notas, y al
  confirmar crea el pedido vía `POST /api/orders`, vacía el carrito, y
  muestra una confirmación con un link directo a WhatsApp para coordinar
  pago/entrega.
