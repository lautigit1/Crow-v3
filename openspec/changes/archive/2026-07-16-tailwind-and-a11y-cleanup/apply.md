# Apply: tailwind-and-a11y-cleanup

## Resumen

Cierra cuatro hallazgos de "necesidad media" de la auditoría técnica del 2026-07-13: unificación de la fuente de colores (Tailwind + `theme.ts`), corrección de contenido legal de cookies, accesibilidad del menú mobile y de botones icon-only, y una auditoría/fix de contraste WCAG AA.

## Archivos modificados

**Tailwind / colores:**
- `frontend/tailwind.config.ts` (nuevo, reemplaza `tailwind.config.js`) — importa colores de `theme.ts`.
- `frontend/src/shared/config/theme.ts` — comentario de cabecera actualizado.
- `frontend/src/features/auth/AccountMenu.tsx` — `PremiumMenuItem` dividido en clases estáticas + inline solo para lo dinámico.
- `frontend/src/features/cart/CartPreview.tsx`, `frontend/src/pages/auth/AuthPanel.tsx`, `frontend/src/pages/cart/CartPage.tsx`, `frontend/src/pages/checkout/CheckoutPage.tsx`, `frontend/src/widgets/testimonials/Testimonials.tsx` — estilos estáticos migrados a clases.
- `frontend/src/shared/ui/Button.tsx`, `frontend/src/app/styles/index.css`, `frontend/src/widgets/navbar/Navbar.tsx` — comentarios corregidos (referencias a `tailwind.config.js` desactualizadas).

**Cookies:**
- `frontend/src/pages/legal/CookiesPage.tsx` — reescrita.

**Accesibilidad:**
- `frontend/src/widgets/navbar/Navbar.tsx` — `MoreSheet` con foco atrapado, Escape, `role="dialog"`.
- `frontend/src/pages/admin/AdminBrandsPage.tsx`, `AdminCategoriesPage.tsx`, `AdminProductsPage.tsx`, `AdminSuppliersPage.tsx`, `AdminUsersPage.tsx` — `aria-label` en botones de eliminar.
- `frontend/src/pages/catalog/CatalogPage.tsx` — `aria-label` en chip de filtro y cierre del panel.
- `frontend/src/shared/ui/Modal.tsx` — `aria-label` en botón de cerrar.

**Contraste (aprobado explícitamente por el usuario):**
- `frontend/src/shared/ui/Badge.tsx` — tono `danger` del badge a `#C92020`.
- `frontend/src/pages/cart/CartPage.tsx`, `frontend/src/pages/checkout/CheckoutPage.tsx`, `frontend/src/pages/auth/AuthShell.tsx`, `frontend/src/pages/admin/DashboardPage.tsx`, `frontend/src/pages/catalog/CatalogPage.tsx`, `frontend/src/pages/not-found/NotFoundPage.tsx` — reemplazo de 3 hex literales de bajo contraste.

## Decisiones documentadas

- Los estilos inline genuinamente dinámicos (colores en runtime, tamaños por prop, animación por `inView`) no se tocaron — ya estaban documentados con comentarios del autor original explicando por qué necesitan quedar inline.
- No se implementó un sistema de consentimiento de cookies: la app no usa cookies no-esenciales, así que la página de cookies documenta la realidad (HttpOnly de auth + localStorage del carrito) en vez de simular un consentimiento que no aplica.
- Los 4 cambios de color se aplicaron recién después de una pregunta explícita al usuario, dado que afectan apariencia visual — no se asumió autorización implícita por tratarse de un fix de accesibilidad.
- Ajuste de contraste vía HSL (mismo hue, lightness reducida) en vez de reemplazar por colores completamente distintos — preserva el look general de la paleta.

## Verificación

- `npx tsc --noEmit` → sin errores.
- `npx vitest run` → 76/76 tests pasando, sin regresiones.
- `npm run build` → build de producción exitoso; CSS generado verificado contra los tokens de `theme.ts`.
- Script de contraste WCAG AA corrido antes y después del fix: los 4 pares identificados pasan de 3.95–~4.0 a 4.60–4.64.

## Pendiente / limitaciones del entorno

- No se corrió una auditoría automatizada con Lighthouse/axe-core: `npx playwright install chromium` falla en este sandbox (`403 Connection blocked by network allowlist`, sin acceso root para instalar un navegador por otra vía). La auditoría de contraste se hizo con un script propio que implementa la fórmula de WCAG directamente — cubre contraste de color, no el resto de las reglas de axe-core (semántica ARIA más allá de lo revisado a mano, orden de tab automatizado, etc.). Si se necesita una auditoría de accesibilidad más completa, correrla en un entorno con navegador disponible.
