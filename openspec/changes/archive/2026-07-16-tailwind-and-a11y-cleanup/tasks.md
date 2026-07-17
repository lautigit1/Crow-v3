# Tasks: tailwind-and-a11y-cleanup

## Implementation tasks

- [x] **T1** — Reemplazar `tailwind.config.js` por `tailwind.config.ts` importando colores de `theme.ts`
- [x] **T2** — Triar ~40 usos de `style={{...}}`; migrar los estáticos a clases Tailwind, dejar los dinámicos documentados sin tocar
- [x] **T3** — Refactor de `AccountMenu.tsx` (`PremiumMenuItem`): separar estilos estáticos (Tailwind) de los dinámicos (inline)
- [x] **T4** — Reescribir `CookiesPage.tsx` con contenido real (cookies HttpOnly + localStorage del carrito), sin analytics/tracking inventado
- [x] **T5** — Accesibilidad de `MoreSheet` en `Navbar.tsx`: foco atrapado, cierre con Escape, `role="dialog"`, restauración de foco
- [x] **T6** — `aria-label` en botones icon-only (borrar en 5 paneles admin, filtros de `CatalogPage`, cerrar de `Modal.tsx`)
- [x] **T7** — Script de auditoría de contraste WCAG AA (Node, fórmula de luminancia relativa) sobre tokens de `theme.ts` y hex literales
- [x] **T8** — Confirmación explícita del usuario antes de aplicar cambios de color (afectan apariencia visual)
- [x] **T9** — Aplicar los 4 fixes de contraste con ajuste mínimo de HSL (mismo hue, lightness ajustada para pasar 4.5:1 con margen)
- [x] **T10** — `tsc --noEmit` sin errores
- [x] **T11** — `vitest run` — 76/76 tests pasando, sin regresiones
- [x] **T12** — `npm run build` exitoso
