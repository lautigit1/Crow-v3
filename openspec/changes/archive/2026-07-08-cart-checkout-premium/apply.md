# Apply: cart-checkout-premium

> Nota: este apply.md se escribió el 2026-07-10, al archivar, reconstruido
> desde `tasks.md`/`design.md` (el change se implementó en una sesión
> anterior que no dejó este artefacto).

## Resumen

Mini-carrito desplegable en la navbar de escritorio (`CartPreview`) y
rediseño premium de `CartPage` y `CheckoutPage`, en dos vueltas: la
primera implementó todo, la segunda corrigió dos problemas reportados con
capturas (botón trigger blanco y escala general chica).

## Archivos modificados

**Nuevos:**
- `frontend/src/features/cart/CartPreview.tsx` — dropdown de vista previa
  del carrito (reusa `shared/ui/Dropdown`): lista con miniaturas, quitar
  con animación, empty state compacto, footer con subtotal + accesos a
  `/carrito` y `/checkout`.

**Modificados:**
- `frontend/src/shared/ui/Icon.tsx` — ícono `minus` (contraparte de `plus`).
- `frontend/src/widgets/navbar/Navbar.tsx` — el ícono de carrito de
  desktop abre `CartPreview` en vez de navegar; `MobileDock` sigue siendo
  `Link` directo (un dropdown anclado a una barra inferior de 56px no
  tiene a dónde desplegarse).
- `frontend/src/pages/cart/CartPage.tsx` — rediseño completo: eyebrow
  mono, filas con índice "01—", stepper rediseñado, animación al quitar,
  panel de resumen `ink900`, empty state a medida.
- `frontend/src/pages/checkout/CheckoutPage.tsx` — rediseño completo:
  2 columnas con resumen sticky, `PaymentMethodPicker` con tarjetas e
  íconos, estado de éxito con número de pedido tipo sello.

## Segunda vuelta (feedback visual)

- Botón trigger blanco: faltaba `bg-transparent` explícito con Preflight
  apagado (bug recurrente del proyecto) — corregido.
- Escalado general subido en las tres piezas (dropdown 360→420px,
  contenedores, imágenes, tipografía, CTAs 52→58px).

## Verificación

- Cada archivo releído tras escribirse; grep sin referencias colgantes a
  `CartButton` ni al `EmptyState` genérico.
- Verificación de apply previa al archivado (2026-07-10): `CartPreview`
  montado en Navbar (import + render), `minus` presente en `Icon.tsx`,
  `PaymentMethodPicker` presente en `CheckoutPage.tsx`. ✓
- T10 (confirmación visual, segunda vuelta) cerrada al archivar: el
  usuario pidió archivar sin reportar nuevos problemas.
