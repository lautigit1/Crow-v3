# Proposal: cart-checkout-premium

## Qué

Dos piezas relacionadas:

1. **Mini-carrito desplegable** (`CartPreview`): un dropdown que se abre
   desde el ícono de carrito de la navbar (desktop), con el mismo patrón
   ya establecido en el sitio para paneles flotantes (`Dropdown`
   compartido, usado hoy por `AccountMenu`; mismo espíritu de overlay que
   `SearchPalette`) — el usuario lo pidió explícitamente: "una pestaña de
   carrito provisional, que se despliegue en algún lado así como el
   buscador". Reemplaza el click directo a `/carrito` por una vista
   previa in-place: ver qué hay, sacar un ítem, o pasar a carrito/checkout
   sin perder el contexto de la página en la que se está.
2. **Rediseño premium** de `CartPage.tsx` y `CheckoutPage.tsx` — el
   usuario pidió explícitamente "un estilo mucho más premium al carrito o
   checkout". Ambas páginas hoy usan el lenguaje visual más genérico de
   todo el sitio (tarjeta blanca simple, stepper de cantidad en cajas
   cuadradas, grid de 2 botones para método de pago) y no reflejan
   ninguno de los motivos ya establecidos en el resto del proyecto
   (índices mono "01—", paneles oscuros `ink900` con propósito real,
   micro-interacciones con `framer-motion`, botones distintivos).

## Por qué

Mensaje del usuario, textual: *"quiero que hagamos como una pestaña de
carrito provisional, que se despliegue en algún lado así como el
buscador o algo asi, y luego quiero que le des un estilo mucho mas
premium al carrito o checkout."*

No vino con un brief extenso de diseño como en Navbar/Auth — se procede
con el mismo criterio de "evitar patrones genéricos" y reusar el
vocabulario visual ya construido en este proyecto (mono index, `ink900`,
botones con micro-interacción, información real no decorativa) en vez de
inventar un lenguaje nuevo para estas dos páginas.

## Diagnóstico de lo actual

- **Carrito en la navbar**: `CartButton` es un `<Link to="/carrito">`
  liso — clickear siempre navega, sin forma de ver o ajustar el carrito
  sin abandonar la página actual.
- **`CartPage.tsx`**: tarjeta blanca con borde simple, filas separadas
  por `border-b`, stepper de cantidad en botones cuadrados con borde,
  sin ninguna animación al agregar/quitar/cambiar cantidad, resumen de
  subtotal como texto plano al pie.
- **`CheckoutPage.tsx`**: layout de una columna, selector de método de
  pago como grid 2×2 de botones de texto plano (sin ícono, sin
  jerarquía), resumen de items en la misma tarjeta blanca que el resto
  del formulario (no hay separación entre "lo que se está pidiendo" y
  "cómo se paga").

## Alcance

1. `shared/ui/Icon.tsx` — ícono `minus` nuevo (el set tenía `plus` pero
   nunca su contraparte).
2. `features/cart/CartPreview.tsx` (nuevo) — dropdown de vista previa,
   con lista de items, subtotal y accesos a `/carrito` y `/checkout`.
3. `widgets/navbar/Navbar.tsx` — el `CartButton` del `ActionRow` de
   escritorio pasa a abrir `CartPreview` en vez de navegar directo. El
   dock mobile (`MobileDock`) **no cambia** — sigue siendo un `Link`
   directo a `/carrito` (ver `design.md` § Por qué no en mobile).
4. `pages/cart/CartPage.tsx` — rediseño completo.
5. `pages/checkout/CheckoutPage.tsx` — rediseño completo, incluyendo el
   selector de método de pago y el estado de éxito.

## Non-goals

- No se toca `CartProvider.tsx` (persistencia, merge de carrito de
  invitado, cálculo de subtotal) — la lógica de estado ya funciona bien,
  esto es exclusivamente rediseño visual + un punto de entrada nuevo
  (preview) que reusa el mismo hook `useCart()`.
- No se agrega pasarela de pago real (Mercado Pago sigue siendo una
  opción que el cliente elige y se coordina manualmente — ver
  `entities/order/index.ts`, ya documentado como decisión previa del
  proyecto). Fuera de alcance de este pedido.
- No se rediseña `MyOrdersPage.tsx` ni el detalle de pedido en la cuenta
  del cliente — el pedido explícito fue carrito/checkout.

## Criterio de éxito

- El ícono de carrito en desktop abre una vista previa sin navegar,
  con la misma sensación de "overlay ligero" que ya tiene el buscador.
- Carrito y checkout se sienten parte del mismo sistema de diseño que
  Navbar/Auth/Home — mono index, tipografía fuerte, `ink900` con
  propósito, sin parecer una plantilla de e-commerce genérica.
- Ninguna regresión funcional: agregar/quitar/cambiar cantidad, vaciar
  carrito, elegir método de pago, confirmar pedido, todo sigue andando
  igual que antes.
- Confirmación visual del usuario.
