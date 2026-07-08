# Proposal: auth-redesign

## Qué

Rediseño completo de las pantallas de autenticación (`/login`, `/registro`,
y — como consecuencia directa de compartir el chasis — `/forgot-password`,
`/reset-password`). Reemplaza el patrón original (split 50/50: panel oscuro
decorativo a la izquierda + tarjeta blanca centrada a la derecha, con
blobs de gradiente) por un panel de acceso integrado (60/40, sin card) y
unifica Login y Register en un solo componente (`AuthPanel`) montado en
ambas rutas, que alterna entre ambos modos sin recargar ni perder lo ya
tipeado.

Este documento cubre **tres vueltas** de este rediseño — ver "Historia" más
abajo. La versión vigente es la tercera (panel 60/40 integrado).

## Por qué

El usuario trajo un brief extenso pidiendo explícitamente evitar los
patrones típicos de pantallas de auth generadas por IA (tarjeta centrada
sobre degradado, dos inputs apilados + botón, tabs para separar
login/register, glassmorphism, 50/50 con imagen decorativa, blobs) y
pidió una experiencia con identidad propia, coherente con el resto del
sitio, con morphing real entre Login/Register en el mismo espacio. Aclaró
además, en un mensaje aparte: **sin temática neon ni tech**.

## Historia (tres vueltas)

**Vuelta 1 — "ficha de cliente" / ticket de service.** Un ticket con
perforación y numeración, flotando sobre un lienzo oscuro, con Login y
Register unificados en un solo componente (`AuthConsole`, nunca llegó a
completarse). A mitad de implementación el usuario cortó: **"que sean 2
pestañas distintas el login y el register, no unificados"** — se separó
en `LoginPage.tsx`/`RegisterPage.tsx` independientes.

**Vuelta 2 — mismo ticket, dos páginas separadas.** Con Login/Register ya
separados, el usuario rechazó el concepto entero: **"no me gusta, quiero
una nueva reestructura"**, con un diagnóstico detallado: pantalla muy
vacía y desbalanceada, exceso de espacio muerto, formulario "pegado a la
derecha", panel de contexto con demasiado espacio para poco contenido,
se siente como landing y no como software profesional, la tarjeta se
siente como un componente aislado sin conexión visual con la columna
izquierda. Cerró con una sugerencia concreta y explícita: abandonar la
tarjeta flotante por completo y construir **un panel de acceso integrado,
60% izquierda con información útil (estado, beneficios, accesos rápidos,
confianza), 40% derecha con un formulario mucho más ancho que no parezca
una tarjeta aislada** — más cercano a software empresarial que a una
landing con login encima. El mismo brief también pidió, en la misma
instrucción, **"no pestañas tradicionales... que ambos formularios
compartan el mismo espacio... que cambiar entre ellos se sienta
natural"** — lo que vuelve, en otros términos, sobre la unificación que
se había descartado en la vuelta 1. Se resolvió priorizar esta
instrucción más reciente y más detallada por sobre la corrección anterior
("no unificados"): el propio pedido de "transición elegante" entre modos
solo tiene sentido con una instancia compartida.

**Vuelta 3 (vigente) — panel 60/40, `AuthPanel` unificado.** Ver
`design.md` para el detalle de la arquitectura. Confirmado como necesario
tras una captura del usuario de la vuelta 2 todavía corriendo en su
navegador: **"no me gusta que sea asi tipo hojas, busca otra manera
porque asi esta muy feo, no va a registrarse ni loguearse nadie"** —
validación directa de que el concepto de ticket/papel no funcionaba y de
que había que abandonarlo por completo, tal como pedía el brief de la
vuelta 2.

## Arquitectura: un componente, dos rutas

`AuthPanel.tsx` se monta en `/login` y `/registro` (mismo tipo de
componente, misma posición en el árbol dentro de `<GuestOnly>`), así que
React no lo desmonta al navegar entre ambas rutas — el formulario ya
tipeado sobrevive el cambio de modo. El modo (`"login" | "register"`) se
deriva de `location.pathname`, no de estado local. El selector es
tipográfico (dos palabras grandes, una activa y una apagada, con
subrayado deslizante `layoutId`), no una tab bar — cumple literalmente
"no pestañas tradicionales" evitando la lectura de indicador de
navegación típica de un tab.

## Non-goals

- No se toca el backend/API de auth (`entities/session/api.ts`), ni la
  lógica de `AuthProvider` — mismo `login`/`register`/`logout`.
- No se rediseña `AdminLayout` ni ningún flujo de admin.
- `ForgotPasswordPage`/`ResetPasswordPage` migran al nuevo chasis
  (`AuthShell`) por necesidad — ya no se puede usar el viejo — pero no
  reciben el tratamiento de selector/morph (son formularios de un solo
  paso, un solo modo); sí heredan el estilo de inputs y el panel
  izquierdo (`InfoBlock` + `QuickAccess`) para que la sección de auth se
  sienta consistente.
- No se agrega login social/OAuth — fuera de alcance, no estaba en el
  producto original.

## Criterio de éxito

- Ningún patrón de la lista prohibida sobrevive: sin tarjeta centrada
  sobre gradiente, sin dos-inputs-y-botón sin identidad, sin tabs planas,
  sin blobs, sin glassmorphism, sin 50/50 decorativo, sin neon/tech glow,
  sin ticket/papel.
- Alternar Login ⇄ Register en el mismo panel, sin recarga, sin perder
  campos ya tipeados.
- El formulario es protagonista del 40% derecho, sin envoltorio de
  tarjeta; el 60% izquierdo aporta información real (métricas de
  servicio, accesos rápidos), no una lista decorativa.
- Accesible: labels reales (`<label htmlFor>`), foco visible, navegación
  por teclado, contraste AA+.
- Confirmación visual del usuario.
