# Design: cart-checkout-premium

## `CartPreview.tsx` (mini-carrito)

Reusa `shared/ui/Dropdown` (mismo componente que ya usa `AccountMenu`):
click-to-open, cierra con click afuera o Escape, panel anclado bajo el
trigger. El trigger visualmente es el mismo `CartButton` de siempre
(ícono + badge de cantidad) — lo único que cambia es que ahora abre un
panel en vez de navegar.

Contenido del panel (ancho 360px, más ancho que el default de 220 del
`Dropdown` — necesita lugar para imagen + nombre + precio por fila):

- Header liviano: "Carrito" + cantidad de items, sin la barra oscura que
  usa `AccountMenu` (esa cabecera oscura es apropiada para datos de
  cuenta; acá compite con las miniaturas de producto por atención, así
  que se deja en blanco).
- Lista de items (scroll interno si supera ~4 filas): miniatura
  (`ProductImage` 44×44), nombre + `cantidad × precio unitario` en mono,
  precio de línea, botón quitar (ícono `close`, aparece siempre visible
  pero sutil — en un panel angosto no hay espacio para "aparece solo en
  hover" como sí tiene sentido en la página completa).
- Quitar un ítem anima con `framer-motion` (`layout` + `AnimatePresence`,
  alto que colapsa) en vez de desaparecer de golpe.
- Empty state compacto: ícono + "Tu carrito está vacío" + link a
  catálogo, sin repetir el empty state grande de `CartPage`.
- Footer: subtotal (mono, grande) + dos acciones — "Ver carrito" (link
  secundario, texto) y "Finalizar compra" (botón primario, va directo a
  `/checkout`, salteando la página de carrito para quien ya revisó acá
  mismo).

## Por qué no en mobile

`MobileDock` (navbar mobile) es una barra fija de 56px de alto pegada al
borde inferior de la pantalla. Un dropdown anclado a un ícono ahí abajo
no tiene a dónde desplegarse sin taparse a sí mismo o salirse de
pantalla, y en touch no existe el gesto de "hover para previsualizar" que
sí justifica un preview en desktop. El ícono de carrito del dock sigue
siendo un `Link` directo a `/carrito` — con la página ya rediseñada
(ver abajo), llegar ahí deja de sentirse como una degradación respecto
al preview de escritorio.

## `CartPage.tsx` (rediseño)

- Header con eyebrow mono ("TU PEDIDO") + título display grande +
  cantidad como badge mono, mismo lenguaje que ya usan Hero/CategoryGrid/
  StatsSection para presentar secciones.
- Cada fila de producto lleva su índice mono ("01—", "02—"…, mismo
  motivo que `StatsSection`/`FieldRow` de Auth) en vez de solo una lista
  sin numerar.
- Stepper de cantidad rediseñado: pastilla con botones −/+ redondeados
  (no cuadrados con borde suelto), número centrado, más grande y con
  mejor área de toque.
- Quitar un producto anima con `framer-motion` (colapso de alto +
  fade), igual que en el preview — consistente entre ambos lugares.
- Panel de resumen distintivo: en vez de texto de subtotal suelto al pie,
  una tarjeta `ink900` (mismo tono que Hero/Stats/Auth) con el desglose
  (subtotal, nota de "envío se coordina") y el botón "Continuar" como
  CTA con micro-interacción (`whileHover`/`whileTap`, mismo lenguaje que
  `StampButton` de Auth y los CTA del Hero).
- Empty state a medida (no el `EmptyState` genérico de `shared/ui/Card`,
  pensado para paneles de admin con tipografía Archivo/Inter que ni
  siquiera son las fuentes del sitio público) — ícono de carrito en
  círculo, mensaje, botón al catálogo con el mismo lenguaje de botón
  distintivo que el resto de la página.

## `CheckoutPage.tsx` (rediseño)

- Layout de dos columnas en desktop (`lg:grid-cols-[1fr_380px]`):
  izquierda = revisión de items (condensada) + selector de método de
  pago + notas; derecha = panel de resumen **sticky** (`ink900`, mismo
  que en `CartPage`) con subtotal, total, CTA de confirmar y una fila de
  confianza (garantía de fábrica / Mendoza / horario real vía
  `contact.hours` — mismos datos ya usados en `StatsSection`/`AuthPanel`,
  no decorativos). En mobile colapsa a una columna, resumen al final
  antes del botón de confirmar.
- `PaymentMethodPicker` rediseñado: de un grid de botones de texto plano
  a tarjetas con ícono por método. El set de íconos del sitio no tiene
  nada literal para medios de pago, así que la asociación es por
  sensación (documentada en el propio `PAYMENT_ICON` de
  `CheckoutPage.tsx`): `refresh` (intercambio) para Transferencia,
  `sparkles` (billetera digital) para Mercado Pago, `lock` (seguridad)
  para Tarjeta, `mapPin` (ubicación física) para Retiro en local. Cada
  tarjeta lleva índice mono y estado seleccionado con borde + check en
  vez de solo cambiar de color de fondo.
- Estado de éxito con más presencia: número de pedido en tipografía
  grande tipo "sello" (mono, con el mismo tratamiento de "código" que
  `AuthShell`/`StatsSection` usan para datos numéricos), pasos siguientes
  explícitos, CTA de WhatsApp con el mismo peso visual que ya usa en el
  resto del sitio (`variant="whatsapp"` del `Button` compartido).

## Piezas nuevas

- `shared/ui/Icon.tsx`: ícono `minus` (agregado antes de este documento,
  ver `tasks.md` T1).
- Sin nuevos componentes compartidos genéricos más allá de eso — el
  resto son piezas locales a `CartPage`/`CheckoutPage`/`CartPreview`
  (stepper, fila de resumen, tarjeta de método de pago), siguiendo el
  mismo criterio ya aplicado en Auth (`AuthFormKit.tsx`) de no forzar
  piezas "genéricas" que en la práctica solo tiene un consumidor.

## Riesgos / verificación

Mismo problema de sync de OneDrive ya documentado repetidamente en este
proyecto: cada archivo se relee con la herramienta de lectura (no
`bash`) inmediatamente después de escribirlo. `tsc`/tests/build quedan
para verificación local del usuario.

## Segunda vuelta (corrección tras feedback visual)

El usuario mandó capturas de `CartPage` y del dropdown de `CartPreview`
abierto con dos problemas:

1. **Botón trigger blanco.** Bug de Preflight-off (recurrente en este
   proyecto — ya visto en el buscador y el botón "Menú" de la navbar):
   `Trigger` en `CartPreview.tsx` no tenía `bg-transparent` explícito en
   su estado cerrado, así que el navegador mostraba su fondo de botón
   por defecto en vez de quedar transparente sobre el fondo oscuro de la
   navbar. Fix: agregar `bg-transparent` a esa rama de clases.
2. **"Se ve como muy chiquito todo."** Se subió la escala de forma
   consistente en `CartPreview.tsx`, `CartPage.tsx` y `CheckoutPage.tsx`
   (imágenes, tipografía, paddings y ancho de contenedor — detalle
   completo en `tasks.md` T8/T9), para que el flujo completo
   carrito → checkout se sienta con el mismo peso visual que el resto
   del sitio en vez de leerse como un componente secundario.

No se tocó lógica (`CartProvider`, `orderApi`, validaciones) — esta
vuelta fue exclusivamente visual, sobre los mismos tres archivos ya
creados/rediseñados en la primera vuelta.
