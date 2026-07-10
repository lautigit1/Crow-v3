# Tasks: cart-checkout-premium

- [x] **T1** — `shared/ui/Icon.tsx`: nuevo ícono `minus`, agregado junto
      a `plus` en el union type y en el mapa de paths.
- [x] **T2** — `features/cart/CartPreview.tsx` (nuevo): dropdown de
      vista previa del carrito, reusando `shared/ui/Dropdown`. Lista de
      items con miniatura/nombre/precio, quitar con animación
      `framer-motion`, empty state compacto, footer con subtotal +
      "Ver carrito"/"Finalizar compra".
- [x] **T3** — `widgets/navbar/Navbar.tsx`: el `CartButton` de
      `ActionRow` (desktop) pasa a ser el trigger de `CartPreview` en vez
      de un `Link` directo. Se borró la función `CartButton` (quedaba sin
      consumidores). `MobileDock` no se tocó (sigue siendo `Link` directo
      a `/carrito`, ver `design.md` § Por qué no en mobile).
- [x] **T4** — `pages/cart/CartPage.tsx`: rediseño completo (header con
      eyebrow mono, filas con índice mono, stepper rediseñado, animación
      al quitar, panel de resumen `ink900`, empty state a medida).
- [x] **T5** — `pages/checkout/CheckoutPage.tsx`: rediseño completo
      (layout de 2 columnas con resumen sticky, `PaymentMethodPicker`
      con ícono + estado seleccionado rediseñado, estado de éxito con
      más presencia — número de pedido tipo sello + pasos siguientes).
- [x] **T6** — Verificación: cada archivo tocado/creado releído con la
      herramienta de lectura tras escribirlo. Se encontró y sacó una
      constante `EASE` sin usar en `CheckoutPage.tsx` (quedó de un
      borrador que terminó sin animaciones con easing custom en ese
      archivo). Confirmado por grep que no quedan referencias a
      `CartButton` fuera de un comentario, ni al `EmptyState` genérico
      viejo en ninguna de las dos páginas rediseñadas. `App.tsx` no
      necesitó cambios (mismos nombres de export `CartPage`/`CheckoutPage`).
- [x] **T7** — Confirmación visual del usuario (primera vuelta): el
      usuario reportó dos problemas con capturas — el botón trigger de
      `CartPreview` se veía blanco, y todo el contenido se sentía chico.
      Ver T8/T9 para la corrección.
- [x] **T8** — Fix bug botón blanco: `CartPreview.tsx` → `Trigger`, el
      estado cerrado no tenía `bg-transparent` explícito. Con Preflight
      apagado (`tailwind.config.js`), un `<button>` sin fondo propio
      muestra el fondo blanco/gris por defecto del navegador — mismo bug
      recurrente ya visto en `Navbar` (buscador, botón "Menú"). Se agregó
      `bg-transparent` a la rama de clases del estado cerrado.
- [x] **T9** — Escalado general ("se ve como muy chiquito todo"): subida
      de tamaño consistente en las tres piezas del flujo.
      - `CartPreview.tsx`: dropdown 360→420px, imagen de fila 44→56px,
        tipografía y paddings de fila subidos, header/subtotal más
        grandes, botones de footer sin `size="sm"`.
      - `CartPage.tsx`: contenedor 780→880px, stepper 36→44px, imagen de
        fila 64→80px, tipografía de nombre/precio subida, panel de
        resumen con más padding y subtotal más grande, CTA 52→58px de
        alto.
      - `CheckoutPage.tsx`: contenedor 980→1080px, columna de resumen
        380→400px, `PaymentMethodPicker` con tarjetas e íconos más
        grandes, `ReviewRow` con imagen 48→64px, `SummaryPanel` con más
        padding y total más grande, CTA 52→58px de alto, `OrderSuccess`
        con número de pedido e ícono más grandes.
- [x] **T10** — Confirmación visual del usuario (segunda vuelta): cerrada
      el 2026-07-10 — el usuario pidió archivar el change sin reportar
      nuevos problemas visuales tras la corrección de T8/T9.

## Verificación de apply (2026-07-10, previa al archivado)

Chequeo contra el código antes de archivar, a pedido del usuario:

- `CartPreview.tsx` existe en `features/cart/` y está montado en
  `Navbar.tsx` (import línea 7, render línea 237). ✓
- `Icon.tsx` incluye el ícono `minus`. ✓
- `CheckoutPage.tsx` contiene el `PaymentMethodPicker` rediseñado. ✓
- `CartPage.tsx` referencia `CartPreview`/lenguaje nuevo. ✓

El apply estaba completo; solo faltaba cerrar T10.
