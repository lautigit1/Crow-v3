# Design: navbar-redesign

## Componentes nuevos (todos dentro de `widgets/navbar/Navbar.tsx`, mismo
## patrón que ya usa el archivo: subcomponentes locales, no un archivo por
## pieza — igual convención que `Hero.tsx`/`CategoryGrid.tsx`)

- `StatusChip` — punto pulsante + texto mono "Abierto ahora"/"Cerrado",
  usa el hook nuevo `useIsOpenNow()`.
- `NavRail` — links con un `<motion.div>` absoluto que hace de subrayado,
  medido con `getBoundingClientRect()` contra refs de cada `NavLink` y
  animado con spring (`left`/`width`). Seguimiento por **hover**, cae al
  link activo cuando no hay hover.
- `SearchPalette` — overlay (`AnimatePresence`), backdrop + panel con
  input autofocus, navega a `/catalogo?q=` (mismo patrón que el buscador
  viejo) y a `/catalogo?cat=` para las categorías rápidas (mismo patrón
  que ya usa `CategoryGrid`, confirmado leyendo `CatalogPage.tsx`: matchea
  por `category.name`). Cierra con Escape, click en backdrop, o al
  navegar. Atajo global "/" para abrirla (ignorado si el foco ya está en
  un input/textarea/contentEditable).
- `ActionCapsule` — cápsula blanca (`rounded-full bg-white shadow`) con:
  botón buscar, link WhatsApp (`waLink()`), link carrito con badge,
  `<AccountMenu />` (reestilizado, ver abajo).
- `MobileDock` — barra flotante inferior fija, 5 accesos, botón central
  "Buscar" elevado (mismo overlay que desktop).
- `MoreSheet` — hoja inferior (reusa el keyframe `slideUp` ya existente en
  `app/styles/index.css`, no uno nuevo) con Marcas/Contacto + bloque de
  cuenta (logueado: avatar+"Ver mi cuenta"+"Salir"; invitado: botones
  Iniciar sesión/Crear cuenta).

## Cambios en archivos existentes

- `shared/ui/Icon.tsx` — 2 íconos nuevos: `home`, `more` (dock mobile).
- `features/auth/AccountMenu.tsx` — `TriggerButton` pierde su borde/fondo
  propio (hoy pensado para vivir solo) para encajar sin "caja dentro de
  caja" dentro de `ActionCapsule`. Es el único consumidor de
  `AccountMenu` en todo el repo (confirmado con grep), así que no hay
  riesgo de romper otro lugar.
- `shared/lib/useIsOpenNow.ts` (nuevo) — mismo patrón que
  `useScrolled`/`useBreakpoint` (hooks chicos de un solo propósito).

## Decisiones técnicas

- **Por qué barra oscura opaca y no blur claro**: el blur blanco es
  exactamente el patrón que el usuario pidió evitar; además `ink900` ya
  es el fondo de Hero/Stats/HowItWorks/CtaFinal en este mismo sitio — la
  barra pasa a sentirse parte del mismo sistema en vez de una pieza de
  chrome neutra tipo "cualquier SaaS".
- **Por qué el subrayado desliza con hover y no con clic/estado fijo**:
  es el mismo gesto de "Ver catálogo" en Hero/CategoryGrid — reutilizar
  un motivo ya validado por el usuario en vez de inventar un cuarto
  patrón de interacción para el mismo sitio.
- **Por qué una cápsula clara separada y no manteer todo oscuro**: separa
  "identidad/navegación" (oscuro) de "acciones transaccionales"
  (buscar/comprar/cuenta, claro) — dos materiales distintos es lo que el
  brief pide ("zonas flotantes", "romper la simetría") en vez de un único
  plano con un botón aislado en la esquina.
- **Por qué dock inferior y no un drawer/hamburguesa mejorado**: el brief
  pide explícitamente repensar mobile más allá de hamburguesa; un dock
  fijo de 5 accesos (patrón app nativa) es más rápido de usar con el
  pulgar que abrir un panel y buscar el link — relevante para el público
  real del sitio (mecánicos/comercios revisando stock desde el celular).
  El botón "Buscar" queda elevado (como un FAB) porque es la acción más
  usada (buscar por SKU/parte).
- **Command palette en vez de input siempre visible**: ataca directo el
  "muy poblada al pedo" — la barra en reposo baja de ~6 elementos
  interactivos visibles a 4 (nav, buscar, whatsapp+carrito+cuenta
  agrupados en una sola cápsula). El atajo "/" mantiene la velocidad para
  quien ya sabe usarlo.
- **`useIsOpenNow` es una aproximación con hora local del navegador**, sin
  librería de timezones — negocio de un solo local en Mendoza, no vale la
  complejidad. Documentado en el propio archivo.
- **Accesibilidad**: todos los elementos interactivos nuevos llevan
  `focus-visible:outline` (variante clara para la cápsula blanca, celeste
  `#7FB0FF` para lo que vive sobre `ink900`), Escape cierra el command
  palette y la hoja "Menú", y los `<Link>`/`<button>` mantienen su
  semántica nativa (nada de `<div onClick>` para navegación).

## Riesgos / lo que no se puede verificar desde este sandbox

Mismo problema ya documentado en `landing-visual-refresh/apply.md`: el
mount de `bash` sobre la carpeta sincronizada con OneDrive queda
desactualizado después de escrituras con las herramientas de archivo, así
que no se puede confiar en `tsc`/build corridos desde acá. Cada archivo
se relee con la herramienta de lectura (no `bash`) inmediatamente después
de escribirlo. Verificación final de `tsc`/tests/build queda, como
siempre, del lado del usuario.
