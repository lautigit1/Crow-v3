# Proposal: tailwind-and-a11y-cleanup

## What

Cuatro hallazgos de "necesidad media" de la auditoría técnica del 2026-07-13, agrupados porque todos tocan la capa visual/de contenido del frontend:

1. Terminar la migración de estilos inline a Tailwind (quedaban ~40 usos de `style={{...}}` sin triar) y unificar la fuente de verdad de colores entre `theme.ts` y `tailwind.config.js` (antes hand-synced manualmente, con riesgo de desincronizarse).
2. Corregir el contenido de la página legal de cookies (`/legal/cookies`), que documentaba cookies de analytics/tracking que la app no usa.
3. Accesibilidad: foco atrapado + cierre con Escape + semántica de diálogo (`role="dialog"`) en el `MoreSheet` del navbar mobile, y `aria-label` en botones icon-only sin texto visible.
4. Auditoría de contraste de color (WCAG 2.1 AA) sobre los tokens de `theme.ts` y hex literales repetidos en el código.

## Why

- **Estilos inline / colores duplicados**: `theme.ts` y `tailwind.config.js` mantenían los mismos tokens de color en dos archivos separados, sincronizados a mano — cualquier cambio de color corría el riesgo de quedar aplicado en uno y no en el otro sin que nada lo detectara.
- **Página de cookies**: afirmaba el uso de Google Analytics (`_ga`, `_ga_*`) y un cookie de consentimiento que no existen en el código — un problema de compliance real, no solo de prolijidad.
- **`MoreSheet` sin foco atrapado**: un usuario de teclado o lector de pantalla podía tabular fuera del sheet mobile hacia contenido oculto detrás, y no había forma de cerrarlo con Escape — falla de accesibilidad básica en un componente que ya existía como patrón (`SearchPalette`, en el mismo archivo, sí lo tenía).
- **Contraste**: varios grises usados como texto secundario no llegaban al mínimo de 4.5:1 de WCAG AA, dificultando la lectura para usuarios con baja visión.

## Non-goals

- No se fuerza la migración de estilos inline genuinamente dinámicos (valores calculados en runtime, dependientes de props o de `inView`) — esos quedan como estaban, ya documentados con comentarios explicando por qué son dinámicos.
- No se implementa un sistema de consentimiento de cookies (banner, opt-in/opt-out) — la app no usa cookies no esenciales, así que no hay nada que pedir consentimiento para. Si en el futuro se agrega analytics, ahí sí corresponde ese trabajo.
- No se corrió Lighthouse/axe-core (sin navegador disponible en el entorno de verificación — ver `design.md`); la auditoría de contraste se hizo con un script propio que implementa la fórmula de WCAG.

## Success criteria

- `tailwind.config.ts` importa los colores directamente de `theme.ts` — un solo lugar para cambiar un color, sin sincronización manual.
- La página de cookies solo documenta cookies que realmente existen en el código (`access_token`, `refresh_token`) y el uso de `localStorage` para el carrito.
- `MoreSheet` atrapa el foco, cierra con Escape, restaura el foco al elemento que lo abrió, y tiene `role="dialog"`/`aria-modal`/`aria-label`.
- Todos los botones de "eliminar" en los paneles admin (sin texto visible, solo ícono) tienen `aria-label` descriptivo.
- Los 4 pares de color que fallaban el mínimo de contraste 4.5:1 ahora pasan (verificado con script), con el mismo look general.
- `tsc --noEmit`, `vitest run` y `npm run build` sin errores.
