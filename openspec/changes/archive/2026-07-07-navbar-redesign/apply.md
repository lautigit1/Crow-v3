# Apply: navbar-redesign

## Resumen

Rediseño completo de `widgets/navbar/Navbar.tsx`. Pasa de una barra
blanca translúcida con blur, simétrica (logo | nav centrada |
search+cart+cuenta) y con menú hamburguesa en mobile, a una barra oscura
opaca (`bg-ink900`, mismo tono que Hero/Stats/HowItWorks/CtaFinal) con
tres zonas asimétricas — marca+estado en vivo, rail de navegación con
subrayado deslizante, cápsula clara flotante de acciones — más una
búsqueda tipo *command palette* y, en mobile, un dock inferior de 5
accesos en vez de hamburguesa.

## Archivos modificados

**Nuevo:**
- `frontend/src/shared/lib/useIsOpenNow.ts` — hook de horario
  abierto/cerrado (lunes a sábado 8-18, hora local del navegador), mismo
  patrón que `useScrolled`/`useBreakpoint`.

**Reescrito completo:**
- `frontend/src/widgets/navbar/Navbar.tsx` — ver `design.md` para el
  detalle de cada subcomponente (`StatusChip`, `NavRail`,
  `SearchPalette`, `ActionCapsule`, `CartButton`, `MobileDock`,
  `DockLink`, `MoreSheet`, `useScrollProgress`).

**Modificados:**
- `frontend/src/shared/ui/Icon.tsx` — 2 íconos nuevos: `home`, `more`
  (dock mobile).
- `frontend/src/features/auth/AccountMenu.tsx` — `TriggerButton` pierde
  su borde/fondo propio para encajar en la cápsula clara sin "caja
  dentro de caja". Único consumidor de `AccountMenu` en el repo
  (confirmado por grep), sin riesgo para otro lugar.

## Qué cambia para quien navega el sitio

- La barra ya no cambia de alto/opacidad al hacer scroll — se mantiene
  oscura y estable, y en su lugar gana una sombra sutil más una barra de
  progreso de scroll en el borde inferior.
- El buscador deja de ser un input siempre visible: es un ícono que abre
  un buscador centrado tipo *command palette* (atajo de teclado "/"),
  con las categorías del catálogo como accesos rápidos.
- Se agrega un chip "Abierto ahora"/"Cerrado" real (no decorativo) y un
  acceso directo a WhatsApp, ninguno de los dos existía antes en la
  navbar.
- Mobile: la barra superior queda solo con logo + estado. Toda la
  navegación (Inicio/Catálogo/Buscar/Carrito/Menú) pasa a un dock
  flotante inferior; "Menú" abre una hoja con Marcas, Contacto, WhatsApp
  y cuenta. Ya no hay menú hamburguesa ni drawer de pantalla completa.

## Decisiones documentadas

- **Subrayado deslizante en vez de pill de fondo tipo Vercel/Linear**:
  el usuario pidió explícitamente evitar esos estilos. Se reutilizó en
  cambio el mismo gesto de subrayado animado que ya usan "Ver catálogo"
  en `Hero`/`CategoryGrid` — motivo propio del sitio, no un patrón
  copiado de otro producto.
- **Cápsula clara flotante sobre barra oscura** en vez de un único plano:
  separa navegación/identidad (oscuro) de acciones transaccionales
  (claro) — ver `design.md` para el detalle completo de por qué.
- **Dock inferior en mobile** en vez de una hamburguesa mejorada: pensado
  para el uso real del sitio (mecánicos/comercios consultando stock desde
  el celular), no solo por seguir el brief al pie de la letra.
- **`useIsOpenNow` usa hora local del navegador**, sin librería de
  timezones — negocio de un solo local en Mendoza, documentado en el
  propio archivo.

## Verificación

- **Integridad de archivos**: cada escritura se releyó con la
  herramienta de lectura (no `bash`), mismo criterio que
  `landing-visual-refresh` tras el hallazgo de corrupción de sync de
  OneDrive en ese change. En la relectura de `Navbar.tsx` se encontraron
  y corrigieron un import sin usar, una variable sin usar y una clase
  Tailwind con una variante (`xs:`) que no existe en
  `tailwind.config.js` — los tres hubieran roto la compilación o
  quedado sin efecto visual.
- **`tsc`/`test`/`build`**: no corridos desde este sandbox, mismo
  problema de sync de OneDrive ya documentado repetidamente en este
  proyecto (el mount que ve `bash` no refleja escrituras recientes de
  forma confiable). Recomendado correr en la máquina del usuario:
  ```bash
  cd frontend
  npx tsc --noEmit -p tsconfig.build.json
  npm run test:run
  npm run build:ci
  ```
- **Revisión visual**: pendiente — el usuario todavía no vio el
  resultado. No se archiva este change hasta su confirmación.

## Estado final

Implementación completa (N1-N5). **No se archiva todavía**: falta la
confirmación visual del usuario (desktop y mobile) y sus verificaciones
locales de `tsc`/tests/build.
