# Tasks: auth-redesign

## Vuelta 1 — ticket unificado (histórico)

- [x] **A1** — `AuthShell.tsx` v1: lienzo oscuro + `TicketNotches` /
      `TicketTag`, API `{ context, children }`.
- [x] **A2** — Corrección de rumbo: "que sean 2 pestañas distintas el
      login y el register, no unificados". Se descarta `AuthConsole`
      (instancia compartida) por dos páginas independientes.

## Vuelta 2 — mismo ticket, dos páginas (histórico)

- [x] **A3** — `LoginPage.tsx` / `RegisterPage.tsx` reescritas como
      páginas independientes, cada una con su `FIELDS`/`HINTS`/`submit`.
- [x] **A4** — `ForgotPasswordPage.tsx` / `ResetPasswordPage.tsx`
      migradas al ticket. Bug encontrado y corregido: el botón "Ir al
      login" del estado `done` de `ResetPasswordPage` no tenía `<form>`
      envolvente — no hacía nada al clickear.
- [x] **A5** — `App.tsx` sin cambios (mismos nombres de export).
- [x] **A6** — Verificación de archivos vía Read tras cada escritura.
- [x] **A7 (superada)** — El usuario, viendo esta versión corriendo en su
      navegador, rechazó el concepto por completo: "no me gusta que sea
      asi tipo hojas... no va a registrarse ni loguearse nadie". Ver
      vuelta 3.

## Vuelta 3 (vigente) — panel 60/40 integrado

- [x] **A8** — `AuthShell.tsx` reescrito por tercera vez: grid
      `lg:grid-cols-[60%_40%]`, sin card, panel izquierdo oculto en
      mobile (`hidden lg:flex`, reemplazado por `MobileTopStrip`). Nueva
      API `{ info, children }`. Nuevos exports: `MobileTopStrip`,
      `StatusStrip`, `MetricTile`, `QuickLink`, `QuickAccess`,
      `InfoBlock`.
- [x] **A9** — `AuthFormKit.tsx` recortado: se eliminan `AuthModeSwitch`,
      `TRUST`, `ContextPanel`, `ContextBlock`, `MobileTrustStrip`.
      Sobreviven `FieldRow`, `passwordStrength`/`PasswordStrengthMeter`,
      `StampButton`, `AuthError`.
- [x] **A10** — `AuthPanel.tsx` (nuevo): un solo componente montado en
      `/login` y `/registro`, reviviendo la idea de instancia compartida
      de la vuelta 1 (esta vez sí completada) — el brief de la vuelta 2
      pidió explícitamente "que ambos formularios compartan el mismo
      espacio... que cambiar entre ellos se sienta natural". Selector de
      modo tipográfico (dos palabras + subrayado `layoutId`), no tab bar.
      Campos que se reorganizan con `AnimatePresence`/`layout` de
      framer-motion al cambiar de modo, sin perder lo ya tipeado.
- [x] **A11** — `LoginPage.tsx` y `RegisterPage.tsx` borrados (requirió
      `mcp__cowork__allow_cowork_file_delete`; `rm` directo falló con
      "Operation not permitted" por ser carpeta sincronizada de OneDrive).
- [x] **A12** — `ForgotPasswordPage.tsx` / `ResetPasswordPage.tsx`
      migradas otra vez, ahora a `{ info, children }` con `InfoBlock` +
      `QuickAccess`.
- [x] **A13** — `App.tsx` actualizado: import de `LoginPage`/`RegisterPage`
      reemplazado por `AuthPanel`, ambas rutas (`/login`, `/registro`)
      montan el mismo componente.
- [x] **A14** — Verificación de consistencia: grep de referencias
      colgantes a la API vieja (`ContextPanel`, `AuthModeSwitch`,
      `TicketNotches`, `TicketTag`, `LoginPage`, `RegisterPage`,
      `MobileTrustStrip`) — sin resultados fuera de lo esperado. Cada
      archivo tocado releído con Read tras escribirlo.
- [x] **A15** — `proposal.md` / `design.md` / `tasks.md` actualizados
      para documentar honestamente las tres vueltas.
- [x] **A16** — Confirmación visual del usuario: corrigió el fondo
      cuadriculado del panel izquierdo y pidió sacar `QuickAccess` por
      completo (ver `apply.md`), ambas resueltas. Change archivado.
