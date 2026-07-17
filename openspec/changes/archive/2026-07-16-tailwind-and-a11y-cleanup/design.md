# Design: tailwind-and-a11y-cleanup

## 1 — Unificación de colores: `theme.ts` como única fuente de verdad

`frontend/tailwind.config.js` se reemplazó por `frontend/tailwind.config.ts`, que importa `{ color }` directamente de `./src/shared/config/theme.ts` (ruta relativa, no el alias `@/`, porque el loader `jiti` que usa Tailwind v3.4 para configs en TS no resuelve alias de Vite) y mapea cada token a `theme.extend.colors`. El resto de la config (`fontFamily`, `borderRadius`, `boxShadow`, `maxWidth`, `spacing`) queda como literales estáticos — el hallazgo de la auditoría hablaba puntualmente de colores, así que se dejó acotado a eso.

Verificado end-to-end con un `npm run build` real y grepeando el CSS generado para confirmar que los valores RGB coinciden exactamente con los tokens de `theme.ts`.

**Estilos inline restantes:** se triaron ~40 usos de `style={{...}}` en todo el frontend. La mayoría son genuinamente dinámicos (colores calculados en runtime, tamaños/anchos dependientes de props, opacidad/animación dependiente de `inView`) y ya tenían comentarios del autor original explicando por qué necesitan quedar inline — esos no se tocaron. Los estáticos se migraron a clases Tailwind, el caso más notable siendo `AccountMenu.tsx` (`PremiumMenuItem`): sus tres bloques `style={{...}}` se dividieron en clases estáticas (`flex`, `gap`, `padding`, `border-radius`, etc.) y solo el `background`/`color` genuinamente dependiente de props (`hov`, `danger`, `fg`) quedó inline. Otros fixes menores: `overflow-hidden` como clase en vez de inline (`CartPreview.tsx`, `AuthPanel.tsx`, `CartPage.tsx`), gradientes radiales migrados a sintaxis de valor arbitrario de Tailwind (`bg-[radial-gradient(...)]`), y una fuente (`Georgia, serif`) migrada a `font-[Georgia,serif]`.

## 2 — Página de cookies: contenido real, no inventado

`frontend/src/pages/legal/CookiesPage.tsx` reescrita para documentar únicamente lo que el código realmente hace, verificado contra `backend/app/core/cookies.py` y `backend/app/core/config.py`:

- Dos cookies HttpOnly: `access_token` (30 min) y `refresh_token` (7 días).
- `localStorage` para persistencia del carrito (`crow_cart_guest_v1`, `crow_cart_user_<id>_v1`, de `CartProvider.tsx`), agregado como sección nueva ("Almacenamiento local") que antes no existía en la página.

Se eliminaron las menciones a Google Analytics (`_ga`, `_ga_*`) y a un cookie de `cookie_consent` — ninguno de los dos existe en el código. `TONE_BADGE` se simplificó a un solo tono ("Esencial") ya que no hay cookies no-esenciales que clasificar.

## 3 — Accesibilidad de `MoreSheet` (navbar mobile)

`frontend/src/widgets/navbar/Navbar.tsx` — se replicó el patrón de diálogo accesible que ya existía en el mismo archivo para `SearchPalette` (que sí tenía `role="dialog"`, `aria-modal`, Escape):

- `sheetRef` sobre el contenedor del sheet, con `role="dialog"`, `aria-modal="true"`, `aria-label="Más opciones"`, `tabIndex={-1}`.
- `useEffect` (deps `[open, onClose]`) que al abrir: guarda `document.activeElement` para restaurar foco al cerrar, enfoca el sheet, y agrega un listener de `keydown` que cierra con Escape y atrapa Tab/Shift+Tab dentro de los elementos focuseables del sheet (`querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')`).
- Al desmontar/cerrar: remueve el listener y restaura el foco al elemento que tenía foco antes de abrir el sheet.

**`aria-label` en botones icon-only:** agregado a los botones de "eliminar" (sin texto visible) en los cinco paneles admin (`AdminBrandsPage`, `AdminCategoriesPage`, `AdminProductsPage` ×2, `AdminSuppliersPage` ×2, `AdminUsersPage` ×2), al botón de "quitar filtro" y "cerrar filtros" de `CatalogPage.tsx`, y al botón de cerrar (×) de `shared/ui/Modal.tsx`.

## 4 — Auditoría de contraste WCAG AA

**Restricción del entorno:** `npx playwright install chromium` falló (`403 Connection blocked by network allowlist` — el sandbox tiene una lista blanca de red que no incluye `cdn.playwright.dev`), y no hay acceso root para instalar un navegador por otra vía. Sin navegador real, Lighthouse/axe-core no son viables en este entorno.

**Alternativa implementada:** un script de Node standalone que calcula la fórmula de contraste de WCAG (luminancia relativa por canal RGB, ratio `(L1+0.05)/(L2+0.05)`) aplicado sistemáticamente a los pares color-de-texto/color-de-fondo de `theme.ts` y a hex literales repetidos encontrados por grep en el código. Se identificaron 4 fallas reales (por debajo de 4.5:1 para texto normal):

1. `Badge.tsx`, tono `danger`: `text-danger` (`#DC2626`) sobre `bg-dangerSoft` → 3.95:1.
2. `#5C7891` usado como texto secundario en `CartPage.tsx`, `CheckoutPage.tsx`, `AuthShell.tsx`.
3. `#4E6B82` en `AuthShell.tsx`, `DashboardPage.tsx`, `CatalogPage.tsx`, `NotFoundPage.tsx`.
4. `#3F5165` en `CatalogPage.tsx`.

Para cada uno se calculó, con un segundo script de conversión HSL↔RGB, el reemplazo más cercano que pasa 4.5:1 con margen de seguridad (target 4.6+), oscureciendo/saturando la lightness en HSL manteniendo el hue original — mismo look general, texto más legible. Se pidió confirmación explícita antes de aplicar los 4 cambios (afectan apariencia visual, no solo código interno).

- `Badge.tsx`: el tono `danger` del badge (no el token global `danger`) pasa a `text-[#C92020]` (4.63:1), con comentario explicando por qué diverge del token global — en cualquier otro contexto (botones, texto sobre blanco) `danger` sigue sin cambios.
- `#5C7891` → `#63819C` (4.60:1).
- `#4E6B82` → `#5E819D` (4.62:1).
- `#3F5165` → `#64809E` (4.64:1) — en `CatalogPage.tsx` únicamente, donde el valor original difería de los otros dos usos de gris oscuro.

Verificado con el mismo script de contraste: los 4 pares ahora están entre 4.60 y 4.64, por encima del mínimo.
