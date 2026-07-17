# Proposal: live-site-settings

## What

Conectar los datos de contacto/empresa del sitio público (teléfono, WhatsApp, email, horario, dirección, Instagram, Facebook) a lo que un admin guarda en el panel de Configuración (`/admin/configuracion`), en vez de un archivo estático hardcodeado (`shared/config/contact.ts`) que el sitio público leía sin importar lo que hubiera guardado en la base.

## Why

- El panel admin ya tenía un formulario de Configuración (`AdminSettingsPage`) funcional, con un endpoint (`GET`/`PUT /api/settings`) que persiste en la tabla `settings` de la base y queda auditado (`settings.update` en el log de Auditoría). Pero nada en el sitio público leía de ahí.
- 16 archivos del frontend (footer, navbar, hero, checkout, ficha de producto, cotizaciones, páginas legales, FAQ, contacto, panel de cotizaciones del admin) importaban directamente el objeto estático `contact` de `shared/config/contact.ts`. Cambiar un dato desde Configuración no tenía ningún efecto visible: el teléfono, WhatsApp y demás seguían siendo los que estaban hardcodeados en el bundle compilado.
- Hallazgo del usuario en esta sesión: "quiero que [Configuración] se linkee con los que están en el footer que están hardcodeados, y que cambio que yo haga se guarde". El guardado ya funcionaba (persistía en la base); lo que faltaba era que el sitio público reflejara ese dato guardado.

## Non-goals

- No se migran los ~16 archivos parcialmente (solo el footer, como se pidió literalmente) — se evaluó con el usuario vía pregunta explícita y se optó por el sitio completo, para no dejar el footer mostrando un dato y el resto del sitio (navbar, checkout, etc.) mostrando otro distinto ante el mismo cambio en Configuración.
- No se agrega un campo separado para "teléfono en formato E.164 para links `tel:`" (`contact.phoneTel` en el archivo viejo) -- se deriva de `whatsapp_number` (mismo número real del negocio), evitando duplicar el dato en el schema del backend.
- El indicador "Abierto ahora" (`useIsOpenNow`) sigue sin parsear el texto libre del campo "Horario" de Configuración -- ver `design.md` para la justificación (parsear texto libre de forma confiable no es viable para un indicador puramente informativo).

## Success criteria

- Cambiar cualquier dato en `/admin/configuracion` y guardar hace que el footer, la navbar (mobile), el hero, el checkout, la ficha de producto, las páginas de contacto/FAQ/legales y el panel de cotizaciones muestren el valor nuevo, sin necesidad de recompilar ni desplegar.
- Los defaults del backend (usados si todavía no hay filas guardadas) coinciden con los datos reales del negocio (Mendoza), no con un placeholder genérico.
- `tsc --noEmit`, `vitest run` (frontend) y `pytest` (backend) pasan sin regresiones.
