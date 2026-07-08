# Design: auth-redesign (v3 — panel 60/40 integrado)

Ver `proposal.md` → "Historia" para las dos vueltas anteriores (ticket de
service, primero unificado y luego separado en dos páginas). Este
documento describe únicamente la arquitectura vigente.

## Archivos

- `pages/auth/AuthShell.tsx` — chasis reescrito por tercera vez. Nueva
  API: `{ info: ReactNode; children: ReactNode }`. Grid `lg:grid-cols-[60%_40%]`:
  izquierda oscura (`bg-ink900`, grilla técnica hairline, oculta en mobile
  vía `hidden lg:flex` — no se apila), derecha blanca sin card (`bg-white`,
  llena su mitad de viewport borde a borde, sin radio ni sombra propios).
  Exporta también `MobileTopStrip` (logo + estado, reemplaza el panel
  izquierdo completo en mobile), `StatusStrip` (punto vivo + "abierto
  ahora", usa `useIsOpenNow()` real), `MetricTile` (número mono grande +
  caption, con `accent` reservado para una sola ficha en ámbar),
  `QuickLink`/`QuickAccess` (3 accesos reales: catálogo, WhatsApp,
  contacto) e `InfoBlock` (eyebrow + título + subtítulo, para las páginas
  de un solo modo).
- `pages/auth/AuthFormKit.tsx` — recortado: se eliminaron `AuthModeSwitch`,
  `TRUST`, `ContextPanel`, `ContextBlock` y `MobileTrustStrip` (todo
  superado por las piezas nuevas de `AuthShell.tsx`). Sobreviven
  `FieldRow`, `passwordStrength`/`PasswordStrengthMeter`, `StampButton`,
  `AuthError` — nunca fueron el problema, lo que se descartó fue el
  envoltorio (ticket) y el panel de contexto reactivo, no los inputs.
- `pages/auth/AuthPanel.tsx` (nuevo) — reemplaza a `LoginPage.tsx` y
  `RegisterPage.tsx` (borrados). Un solo componente, montado en `/login` y
  `/registro` dentro de `<GuestOnly>` en `App.tsx`. Ver "Arquitectura
  compartida" abajo.
- `pages/auth/ForgotPasswordPage.tsx` / `ResetPasswordPage.tsx` —
  migradas a la nueva firma `{ info, children }`, usan `InfoBlock` +
  `QuickAccess` en el panel izquierdo. Sin selector de modo (formularios
  de un solo paso).
- `app/App.tsx` — las rutas `/login` y `/registro` ahora importan y
  montan el mismo `AuthPanel`:
  `<Route path="/login" element={<GuestOnly><AuthPanel /></GuestOnly>} />` /
  `<Route path="/registro" element={<GuestOnly><AuthPanel /></GuestOnly>} />`.

## Arquitectura compartida: por qué no se remonta al navegar

React Router v6 renderiza, para la ruta que matchea, un único árbol de
elementos. Si dos `<Route>` hermanas usan el **mismo tipo de componente**
en el mismo punto del árbol (`GuestOnly > AuthPanel` en ambos casos),
React reconcilia por tipo + posición, no por qué `Route` matcheó — al
navegar de `/login` a `/registro` el fiber de `AuthPanel` no se
desmonta, solo se re-renderiza con la nueva `location`. Esto es lo mismo
que ya pasa, por ejemplo, con `<Route path="/productos/:id" element={<ProductDetailPage/>} />`
al cambiar `:id`: mismo componente, no remonta. `AuthPanel` deriva
`mode` de `location.pathname` en cada render (`"registro" ? "register" :
"login"`) en vez de guardarlo en estado local — así el modo siempre
refleja la URL (permite compartir/recargar `/registro` directamente) y
al mismo tiempo el `useState` del formulario (`form`) sobrevive porque
vive en la misma instancia de componente.

## Selector de modo: por qué no es una tab bar

El brief pidió explícitamente "no pestañas tradicionales". En vez de un
track con dos botones de igual jerarquía visual (patrón tab), el
selector son dos palabras en tipografía display, una grande y oscura
(modo activo) y una chica y apagada (modo inactivo) — el propio título
de la pantalla funciona como switch. Un `<motion.span layoutId="authModeUnderline">`
desliza un subrayado entre ambas al hacer click (mismo mecanismo que ya
usa el indicador de hover del `NavCluster` en la navbar). El tamaño de
fuente también transiciona (`text-[19px]` → `text-[34px]`), reforzando
la idea de "el modo activo toma protagonismo" en vez de "hay un tab
seleccionado".

## Campos: por qué se reorganizan en vez de reemplazarse

Login (2 campos: email, contraseña) y Register (4: nombre, email,
teléfono, contraseña) comparten `email` y `contraseña`. `AuthPanel`
mantiene un único `ALL_FIELDS` con un flag `modes: Mode[]` por campo, y
filtra según el modo activo. Cada fila está envuelta en
`<motion.div layout initial={height:0} animate={height:"auto"} exit={height:0}>`
dentro de un `<AnimatePresence>`, y el `<motion.form layout>` que las
contiene anima el resto de la columna cuando el alto cambia — así,
alternar a Register hace que "Nombre completo" y "Teléfono" se expandan
con una animación de layout real (no un fade de página a página), y
alternar de vuelta a Login los colapsa. El índice mono ("01—", "02—") se
recalcula por posición visible, no es fijo por campo.

## Panel izquierdo: información real, no una lista de beneficios

Corrigiendo el diagnóstico de la vuelta 2 ("panel de contexto con
demasiado espacio para poco contenido, se siente como landing"), el
panel de 60% ahora muestra:

- Eyebrow + título + subtítulo, mode-aware, con crossfade
  (`AnimatePresence mode="wait"`) al cambiar de modo.
- Una grilla 2×2 de `MetricTile` con datos reales ya establecidos en el
  sitio (mismos que `StatsSection.tsx` en la home): `1H` respuesta
  máxima, `HOY` entrega en Mendoza, `100%` garantía de fábrica, `0` bots
  (asesoría real) — esta última es la única ficha con el cuarto color
  (ámbar), reservado para jerarquía puntual, no decoración repetida.
- `QuickAccess`: 3 links reales (catálogo, WhatsApp, contacto) — no
  decorativos, mismo gesto de flecha+hover que ya usa el resto del sitio.

## Decisiones documentadas

- **Por qué se abandona el ticket/papel**: la vuelta 2 ya diagnosticaba
  que el concepto se sentía como landing, no como software; una captura
  de pantalla del usuario en la vuelta 3, todavía sobre esa versión
  corriendo en su navegador, lo confirmó de forma directa: **"no me
  gusta que sea asi tipo hojas... no va a registrarse ni loguearse
  nadie"**. El panel 60/40 sin card es la sugerencia textual del propio
  usuario en el cierre del brief de la vuelta 2, no una interpretación
  libre.
- **Por qué el formulario no tiene envoltorio de tarjeta**: ocupa
  directamente el 40% derecho, `bg-white` de la mitad del viewport — la
  ausencia de borde/sombra/radio es intencional, para que se sienta
  parte de la interfaz y no un componente flotando encima de un fondo.
- **Mobile**: el panel izquierdo completo se oculta (`hidden lg:flex`),
  no se apila arriba del formulario — se reemplaza por `MobileTopStrip`
  (logo + estado, una sola fila). El formulario es lo primero que se ve
  en pantallas chicas.
- **"No neon ni tech"** (aclaración explícita del usuario, sigue
  vigente): el lienzo oscuro usa una grilla técnica (`linear-gradient`
  hairlines, opacidad ~5%), sin glows radiales de color eléctrico.
- **Accesibilidad**: `<label htmlFor>` real en cada campo, foco visible
  (`focus-visible:outline`) en selector de modo, toggle de contraseña y
  botón principal, `required`/`minLength`/`autoComplete` nativos,
  mensajes de error con ícono + texto.

## Riesgos / verificación

Mismo problema de sync de OneDrive ya documentado repetidamente en este
proyecto: cada archivo se relee con la herramienta de lectura (no
`bash`) inmediatamente después de escribirlo. `LoginPage.tsx` y
`RegisterPage.tsx` requirieron `allow_cowork_file_delete` para poder
borrarse (el `rm` directo devolvió "Operation not permitted" sobre la
carpeta sincronizada de OneDrive). `tsc`/tests/build quedan, como
siempre, para verificación local del usuario.
