# Apply: auth-redesign

## Resumen

Rediseño completo de las pantallas de autenticación (`/login`, `/registro`,
`/forgot-password`, `/reset-password`), en tres vueltas — ver
`proposal.md` § Historia para el detalle de cada una. Versión final:
panel de acceso integrado 60/40 sin card, con Login y Register unificados
en un solo componente (`AuthPanel`) montado en ambas rutas.

## Estado final

**Vuelta 1** (ticket unificado) y **vuelta 2** (mismo ticket, dos páginas
separadas) quedaron completamente reemplazadas por la **vuelta 3**
(vigente): panel 60/40 sin card, sin ticket/papel. Dentro de la vuelta 3
hubo además una corrección menor tras confirmación visual: el fondo del
panel izquierdo tenía una grilla técnica tipo "cuadriculado" que el
usuario no quiso, y el bloque de accesos rápidos (catálogo/WhatsApp/
contacto) se sacó por completo — no tiene sentido dejar salir a alguien
del login hacia el catálogo, y como bloque visual quedaba raro.

## Archivos modificados

**Nuevos:**
- `frontend/src/pages/auth/AuthPanel.tsx` — reemplaza a `LoginPage.tsx`/
  `RegisterPage.tsx` (borrados). Un solo componente montado en `/login` y
  `/registro`; selector de modo tipográfico (dos palabras + subrayado
  `layoutId`, no tab bar); campos que se reorganizan con
  `AnimatePresence`/`layout` de framer-motion al cambiar de modo.

**Reescritos:**
- `frontend/src/pages/auth/AuthShell.tsx` — chasis reescrito tres veces
  (ver `design.md`). Versión final: grid `lg:grid-cols-[60%_40%]`,
  izquierda oscura sin grilla (wash radial sutil, `rgba(0,87,217,.16)`),
  derecha blanca sin card. Exporta `MobileTopStrip`, `StatusStrip`,
  `MetricTile`, `InfoBlock`. (`QuickLink`/`QuickAccess` se agregaron y
  luego se borraron por completo en la corrección final.)
- `frontend/src/pages/auth/AuthFormKit.tsx` — recortado a las piezas que
  sobrevivieron las tres vueltas: `FieldRow`, `passwordStrength`/
  `PasswordStrengthMeter`, `StampButton`, `AuthError`.
- `frontend/src/pages/auth/ForgotPasswordPage.tsx` /
  `ResetPasswordPage.tsx` — migradas a la API final de `AuthShell`
  (`{ info, children }`), usan `InfoBlock` sin accesos rápidos.

**Modificados:**
- `frontend/src/app/App.tsx` — rutas `/login` y `/registro` montan el
  mismo `AuthPanel` (antes: `LoginPage`/`RegisterPage` independientes).

**Borrados:**
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/RegisterPage.tsx`

## Qué cambia para quien usa el sitio

- Login y Register ya no son dos URLs con layouts idénticos y formularios
  distintos: es una sola pantalla que alterna de modo sin recargar y sin
  perder lo ya tipeado (email/contraseña sobreviven el cambio).
- El formulario ocupa el 40% derecho de la pantalla, a pantalla completa,
  sin tarjeta/card — antes era una tarjeta centrada (v1: papel/ticket) o
  flotando sobre gradiente (versión original pre-rediseño).
- El panel izquierdo (60%, solo desktop) muestra información real del
  negocio (tiempo de respuesta, entrega en Mendoza, garantía, asesoría
  real) en vez de una lista de beneficios genérica — y ya no ofrece
  navegación hacia afuera del flujo de auth.
- Mobile: el panel izquierdo se reemplaza por una tira mínima (logo +
  estado abierto/cerrado), no se apila arriba del formulario.

## Decisiones documentadas

- **Por qué un solo componente para Login/Register**: el usuario pidió
  primero que fueran dos páginas separadas, y después —en un brief más
  detallado— que compartieran el mismo espacio con una transición
  elegante. Se priorizó la instrucción más reciente; ver
  `proposal.md` § Historia para las citas textuales de ambas.
- **Por qué se sacó la grilla del panel izquierdo**: corrección directa
  del usuario tras verlo renderizado ("el cuadrillado no me gusta").
  Reemplazada por un wash radial de un solo color, muy sutil.
- **Por qué se sacó `QuickAccess` por completo**: el usuario señaló
  específicamente que no tiene sentido poder navegar al catálogo desde
  el login, y que el bloque en conjunto "estaba raro". En vez de sacar
  solo el link al catálogo, se eliminó el patrón completo (incluye
  también WhatsApp y contacto) de las tres pantallas que lo tenían.

## Verificación

- **Integridad de archivos**: cada escritura de este change se hizo con
  las herramientas de archivo (`Read`/`Write`/`Edit`) y se releyó con esa
  misma herramienta después de escribir, nunca con `bash` — mismo
  criterio ya establecido en `remove-inline-styles-tailwind` y repetido
  en `landing-visual-refresh`/`navbar-redesign` tras el problema de sync
  de OneDrive documentado en esos changes.
- **Borrado de archivos**: `LoginPage.tsx`/`RegisterPage.tsx` no se
  pudieron borrar con `rm` directo (`Operation not permitted`, carpeta
  sincronizada de OneDrive); se resolvió con
  `mcp__cowork__allow_cowork_file_delete`.
- **Consistencia**: grep de cierre sin referencias colgantes a la API
  vieja de `AuthShell` (`ContextPanel`, `AuthModeSwitch`,
  `TicketNotches`, `TicketTag`) ni a los componentes borrados
  (`LoginPage`, `RegisterPage`, `QuickAccess`, `QuickLink`).
- **`tsc`/tests/build**: no corridos desde este sandbox, mismo problema
  de sync de OneDrive ya documentado repetidamente en este proyecto.
  Recomendado correr en la máquina del usuario:
  ```bash
  cd frontend
  npx tsc --noEmit -p tsconfig.build.json
  npm run test:run
  npm run build:ci
  ```
- **Revisión visual**: confirmada por iteración directa del usuario sobre
  capturas reales (fondo cuadriculado y accesos rápidos corregidos a
  partir de feedback puntual sobre la versión renderizada).
