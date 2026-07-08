# Tasks: remove-inline-styles-tailwind

## Fase 0 — Setup

- [x] **T1** — `tailwind.config.js` generado desde `theme.ts` (colores, fuentes, radios, sombras), Preflight OFF
- [x] **T2** — `postcss.config.js`
- [x] **T3** — `@tailwind base/components/utilities` en `app/styles/index.css`, sin tocar el CSS existente
- [x] **T4** — `tailwindcss`, `postcss`, `autoprefixer`, `clsx` agregados a `package.json`
- [x] **T5** — Usuario corrió `npm install` y confirmó visualmente que `Button` no cambió

## Fase 1 — `shared/ui/` (17 archivos)

- [x] **T6** — `Button.tsx` (validado visualmente por el usuario, sin cambios tras `npm install`)
- [x] **T7** — `Badge.tsx`
- [x] **T8** — `Card.tsx` (`pad` queda inline a propósito, ver comentario en el archivo)
- [x] **T9** — `Modal.tsx` (`width` queda inline a propósito; `onMouseEnter/Leave` del botón cerrar → `hover:`)
- [x] **T10** — `Dropdown.tsx` (`width` queda inline a propósito; `onMouseEnter/Leave` de `MenuItem` → `hover:`)
- [x] **T11** — `DataTable.tsx` (`width` de columna queda inline a propósito; `onMouseEnter/Leave` de filas → `hover:` condicional)
- [x] **T12** — `Drawer.tsx` (`width` queda inline a propósito; `onMouseEnter/Leave` del botón cerrar → `hover:`)
- [x] **T13** — `Field.tsx` (de paso reemplaza `Object.assign(currentTarget.style,...)` en focus/blur por `focus:` nativo)
- [x] **T14** — `Pagination.tsx`
- [x] **T15** — `Avatar.tsx` (size/color/fontSize quedan inline a propósito, ver comentario)
- [x] **T16** — `ConfirmModal.tsx`
- [x] **T17** — `Container.tsx` (`isMobile` de `useBreakpoint()` reemplazado por `md:` real, mismo breakpoint de 768px)
- [x] **T18** — `Icon.tsx` (+ soporte de prop `className`, usado por Pagination)
- [x] **T19** — `Logo.tsx`
- [x] **T20** — `ProductImage.tsx` (ratio/radius/gradientes hue quedan inline a propósito)
- [x] **T21** — `SectionHeading.tsx`
- [x] **T22** — `Spinner.tsx`
- [x] **T22b** — `AnimatedOutlet.tsx` (no estaba en el conteo original de 17; keyframe `routeFadeIn` movido a `index.css`, se retira la inyección de `<style>` vía JS)
- [x] **T23** — Retirado `.hoverable` / `--hover-*` de `index.css`: confirmado sin más usos tras migrar `pages/brands/BrandsPage.tsx` (Fase 5) y borrar `shared/lib/Hoverable.tsx` (ya sin consumidores)

**Bug encontrado durante verificación (no relacionado con este change):** `npm run test:run` fallaba en 4 suites (`e2e/*.spec.ts`) porque el include glob default de Vitest también matchea `*.spec.ts`, y Vitest intentaba correr los specs de Playwright con su propio runner (`test.describe()` de Playwright no es compatible con el de Vitest). Pre-existente desde el change `e2e-playwright-setup` (04/07), no introducido por esta migración — los 57 tests reales de Vitest pasaron limpio. Se agregó `exclude: [...configDefaults.exclude, "e2e/**"]` en `vite.config.ts` para separar ambos runners.

**Fase 1 completa.** Exceptions documentadas (valores genuinamente dinámicos que quedan como `style` inline, todo lo demás en cada uno de estos 8 archivos ya es Tailwind): `Avatar.tsx` (size/color/fontSize), `Card.tsx` (`pad`), `DataTable.tsx` (ancho de columna), `Drawer.tsx`/`Modal.tsx`/`Dropdown.tsx` (`width`), `ProductImage.tsx` (ratio/radius/gradientes hue), `Spinner.tsx` (size/stroke). Los otros 10 archivos (`AnimatedOutlet`, `Badge`, `Button`, `ConfirmModal`, `Container`, `Field`, `Icon`, `Logo`, `Pagination`, `SectionHeading`) quedaron en 0% inline style.

## Fase 2 — `entities/` + `features/` (3 archivos)

- [x] **T24a** — `entities/product/ProductCard.tsx` (de paso saca 2 `useState` + `onMouseEnter/Leave` que solo alternaban valores estáticos, incluido un `currentTarget.style.background =` directo, reemplazados por `hover:`/`group-hover:`)
- [x] **T24b** — `features/auth/AccountMenu.tsx` (`TriggerButton`/`DropdownHeader`/`Divider`/vista guest migrados; `PremiumMenuItem` queda con `hov` state + inline style a propósito — `accent` es un hex string libre por ítem y su tinte de hover se computa en runtime, `` `${fg}18` ``, no es una clase Tailwind posible)
- [x] **T24c** — `features/quote/QuoteModal.tsx`

## Fase 3 — `widgets/` (12 archivos)

- [x] **T25a** — `widgets/about/AboutSection.tsx` (`useBreakpoint()` → `md:`; opacidad/animación de scroll-reveal quedan inline a propósito, dependen de `inView` en runtime)
- [x] **T25b** — `widgets/brand-strip/BrandStrip.tsx` (`hovered` state de `BrandPill` → `hover:` nativo)
- [x] **T25c** — `widgets/category-grid/CategoryGrid.tsx` (`hov` state de `Card` → `group`/`group-hover:`; `useBreakpoint()` → `md:`)
- [x] **T25d** — `widgets/cta/CtaFinal.tsx` (`useBreakpoint()` → `md:`; gradiente de texto → `bg-clip-text text-transparent [-webkit-text-fill-color:transparent]`; `ContactItem` `onMouseEnter/Leave` → `hover:`, solo en la rama `<a>` para preservar la asimetría original con `<span>`)
- [x] **T25e** — `widgets/featured-products/FeaturedProducts.tsx`
- [x] **T25f** — `widgets/footer/Footer.tsx` (wrapper `Hoverable` reemplazado por `hover:` nativo; `Hoverable` en sí sigue en uso por `pages/brands/BrandsPage.tsx`, Fase 5, así que el componente compartido queda hasta migrar esa página también)
- [x] **T25g** — `widgets/hero/Hero.tsx` (`useBreakpoint()` → `md:`; `onMouseEnter/Leave` de los 2 CTAs → `hover:`; delays de los 3 dots del "escribiendo..." precomputados por índice; el `background-image` data-URI del fondo del chat queda inline a propósito, ver comentario)
- [x] **T25h** — `widgets/how-it-works/HowItWorks.tsx` (`useBreakpoint()` → `md:`; CTA `onMouseEnter/Leave` → `hover:bg-[#0046b8]` — hex distinto de `color.primaryDark`, se mantiene como valor arbitrario propio; `STEPS.map` con condicionales `clsx` por índice, primero-vs-resto y último-vs-no-último)
- [x] **T25i** — `widgets/navbar/Navbar.tsx` (`hovered` de `NavItem` → `hover:` nativo; `focused` de `SearchBar` se mantiene para el ícono —precede al input en el DOM, `peer-focus` no llega hacia atrás— pero el input usa `focus:` nativo y el hint "/" usa `peer-focus:hidden`; `isMobile` de `useBreakpoint()` se mantiene a propósito, ver comentario en el archivo: las ramas mobile/desktop montan subárboles interactivos distintos y duplicarlos con CSS duplicaría elementos accesibles; keyframe `slideDown` movido de un `<style>` inyectado por JS a `index.css`)
- [x] **T25j** — `widgets/stats/StatsSection.tsx` (`useBreakpoint()` → `md:`; bordes por índice/breakpoint precomputados en `BORDER_CLASSES`)
- [x] **T25k** — `widgets/testimonials/Testimonials.tsx` (delays de reveal por índice precomputados en `REVEAL_ANIM`; `fontFamily: "Georgia, serif"` del signo de comilla decorativo queda inline a propósito, es una fuente fuera del sistema de diseño)
- [x] **T25l** — `widgets/trust-band/TrustBand.tsx` (accent/bg hex por ítem precomputados a clases Tailwind en `ITEMS`)

**Fase 3 completa** (12/12 widgets).

## Fase 4 — `pages/` admin

- [x] **T26** — `AdminProductsPage.tsx` (el caso más grande, 300+ líneas; `tabClass()` con `clsx` en vez de un objeto de estilo por render)
- [x] **T26b** — `pages/admin/ui/AdminHeader.tsx`, `ui/StatCard.tsx` (tonos precomputados a clases Tailwind, igual que `TrustBand`), `ui/Charts.tsx` (`accent` de `BarChart` y color por segmento de `DonutChart` quedan inline a propósito, son valores runtime)
- [x] **T26c** — `AdminLayout.tsx` (`SidebarItem` pierde su `hov` state -- `hover:`/`group-hover:` nativos; `onMouseEnter/Leave` de "Ver sitio" y el botón de logout → `hover:`; avatares con `hsl(hue,...)` quedan inline, `hue` es por-usuario en runtime)
- [x] **T27** — Resto de páginas admin: `AdminInventoryPage`, `AdminCategoriesPage`, `AdminBrandsPage`, `AdminQuotesPage`, `AdminUsersPage`, `AdminReportsPage`, `AdminAuditPage`, `AdminSettingsPage`, `AdminSuppliersPage`, `DashboardPage`. Patrón repetido: tonos de un tamaño fijo (2-5 variantes) precomputados a clases Tailwind literales (`USER_STAT_TONES`, `SUMMARY_TONES`, `QUICK_TONES`); toggles de 2 estados en `Button` (activar/desactivar con `color.warning`/`color.success`) se dejan con `style` inline a propósito -- Button ya soporta ese passthrough y no depende de ganar una pulseada de especificidad contra las clases propias de la variante `outline`; `Avatar` de `AdminUsersPage` sigue el mismo patrón que `shared/ui/Avatar.tsx` (size/hue-derivados quedan inline).

**Fase 4 completa** (todas las páginas de `pages/admin/`).

## Fase 5 — `pages/` público

- [x] **T28** — `CatalogPage.tsx` (`SkeletonCard`, `FilterChip`, `FilterPanel` migrados; `useBreakpoint()` se mantiene a propósito para la rama sidebar-desktop vs. drawer-mobile -- cada una monta su propia copia completa de `FilterPanel` con selects/checkbox/botones, mismo motivo que `Navbar.tsx`: ocultar una con CSS duplicaría elementos interactivos en el DOM. El resto de usos de `isMobile` que eran puramente cosméticos -- padding del body, block/grid -- pasaron a `clsx` con el mismo booleano en vez de `md:`, ya que `isMobile` de todos modos hace falta para la rama estructural. El header (fondo navy) usa un padding horizontal fijo de 40px en todos los breakpoints, distinto del 16/40 responsive por defecto de `Container` -- se pasa como `style` en vez de className conflictiva, mismo motivo que el comentario de `Field.tsx` sobre no poder confiar en el orden de generación de Tailwind para que una clase le gane a otra que setea la misma propiedad. Keyframe `slideUp` del drawer (antes un `<style>` inyectado por JS) movido a `index.css`; `shimmer` reutiliza el keyframe global ya existente. `ProductDetailPage.tsx` migrado completo (breadcrumb, imagen, badges, `QuantityStepper`).
- [x] **T29** — `CartPage.tsx` y `CheckoutPage.tsx` migrados completos (`CartRow`, `PaymentMethodPicker`); sin excepciones dinámicas en ninguno de los dos.
- [x] **T28b** — Dos archivos de `app/` que el `proposal.md` contaba en el alcance (72 = ...+ `app`: 2) pero no tenían tarea propia y quedaron sin migrar hasta la verificación final: `app/layouts/PublicLayout.tsx` y `app/providers/ErrorBoundary.tsx`. Ambos convertidos completos, sin excepciones.
- [x] **T30** — Cuenta: `AccountLayout`, `ProfilePage`, `AccountSettingsPage`, `MyQuotesPage`, `FavoritesPage`, `MyOrdersPage`. Patrón repetido: `hov` states de tarjetas/links → `hover:`/`group-hover:` nativos; tonos fijos precomputados a clases literales (`STATUS_BADGE` en `MyOrdersPage` para los 6 estados de `ORDER_STATUS_COLOR`); overrides de `Button` variant="ghost" con colores puntuales quedan con `style` inline (mismo motivo que en Fase 4: no depender del orden de generación de Tailwind para ganarle a las clases propias de la variante)
- [x] **T31** — Resto: `pages/legal/*` (6 archivos, incluye `LegalLayout` con sus componentes de prosa compartidos `H2/P/UL/InfoBox/Divider`), `pages/auth/*` (5 archivos, `AuthShell` + Login/Register/Forgot/Reset), `pages/brands/BrandsPage.tsx` (última usuaria de `Hoverable` → migrada a `hover:` nativo, `shared/lib/Hoverable.tsx` borrado por quedar sin uso, `.hoverable`/`--hover-*` retirado de `index.css`, cierra **T23**), `pages/faq/FaqPage.tsx`, `pages/contact/ContactPage.tsx`, `pages/home/HomePage.tsx` (ya estaba limpia, solo compone widgets), `pages/not-found/NotFoundPage.tsx`

## Verificación final

- [x] **T32** — `grep -rl "style={{" src --include="*.tsx"` sobre las 72 archivos del alcance: 28 remanentes, los 28 documentados (valores dinámicos en runtime: `Avatar`/`Card`/`Container`/`DataTable`/`Drawer`/`Dropdown`/`Modal`/`ProductImage`/`Spinner` en `shared/ui`; `accent`/colores por segmento en `admin/ui/Charts.tsx`; hue de avatares en `AdminLayout`/`AdminUsersPage`/`AccountMenu`; scroll-reveal en `AboutSection`/`BrandStrip`/`CategoryGrid`/`CtaFinal`/`FeaturedProducts`/`Hero`/`HowItWorks`/`StatsSection`/`Testimonials`/`TrustBand`; `iconColor` de `Panel` en `DashboardPage`; toggles de `Button` variant en `AdminSuppliersPage`/`AdminUsersPage`/`FavoritesPage`/`MyQuotesPage`; `maxWidth` de `Card` en `AdminSettingsPage`; `CatalogPage`'s header de 40px fijo). De paso se migraron 2 archivos de `app/` (`PublicLayout.tsx`, `ErrorBoundary.tsx`) que el `proposal.md` contaba en el alcance pero no tenían tarea asignada — ver T28b.
- [x] **T33** — `grep -rl "currentTarget.style" src --include="*.tsx"` sobre código real (no comentarios): 1 remanente en `AdminBrandsPage.tsx` (`onError={(e) => { e.currentTarget.style.display = "none"; }}` para ocultar una imagen de marca rota) -- caso distinto al antipatrón original (`onMouseEnter/Leave` mutando estilos para simular hover), no tiene equivalente en CSS puro (no existe pseudo-clase `:error` para imágenes), se mantiene intencionalmente.
- [ ] **T34** — `npm run test:run` -- **bloqueado en este sandbox**, no por el código migrado. Al ejecutar `vite build`/`vitest run` se detectó que varios archivos de `node_modules` (ajenos a este change, nunca tocados por la migración -- ej. `node_modules/vite/package.json`, varios `.d.ts` de `vite/types`) están truncados en el filesystem que este agente monta sobre la carpeta sincronizada por OneDrive. `package.json` se pudo reparar a mano (el corte caía en un campo `scripts` no crítico), pero varios `.d.ts` de Vite quedaron truncados a mitad de una declaración y no hay acceso de red desde este sandbox para reinstalar `node_modules` (`npm install` devuelve 403 contra el registry). **Nota separada, más importante:** el mismo tipo de truncado/relleno con bytes nulos apareció en decenas de archivos de `src/` editados en sesiones anteriores de este mismo change (ver detalle abajo) -- se detectó y corrigió recién ahora, al intentar correr `tsc` por primera vez desde que arrancó la migración. Con esos 63 archivos reparados, `npx tsc --noEmit -p tsconfig.build.json` corre limpio (0 errores) sobre todo `src/`. Recomendado: correr `npm run test:run` directamente en la máquina del usuario (fuera de este sandbox), donde `node_modules` no debería tener este problema de sincronización.
- [ ] **T35** — `npm run build:ci` -- mismo bloqueo que T34 (falla en el paso `vite build` por los `.d.ts` truncados de `node_modules/vite`, no por código propio). El `tsc --noEmit` que build:ci corre primero si pasa limpio. Recomendado correr localmente igual que T34.
- [x] **T36a** — **Bug crítico encontrado por el usuario y corregido**: tras confirmar visualmente `AboutSection.tsx` (ficha técnica) y `StatsSection.tsx` ("Sin bots"), reportó que faltaban líneas/bordes aunque el resto (colores, tipografía, espaciado) estaba bien. Se comparó cada valor 1 a 1 contra el `style={{...}}` original vía `git diff` y coincidía exacto -- el bug no estaba en ningún archivo puntual sino en `tailwind.config.js`: `corePlugins.preflight: false` (desactivado a propósito para no resetear el look de headings/botones/forms) también desactiva la única regla de Preflight que pone `border-style: solid` por defecto en todo elemento. Sin esa regla, las utilidades `border`/`border-t`/`border-b`/`border-r`/`border-l` de Tailwind solo fijan ancho y color -- el navegador sigue usando su default `border-style: none` y la línea nunca se dibuja, aunque el ancho y el color estén bien puestos. Esto afectaba **todos** los bordes agregados por esta migración en las ~70 páginas, no solo las dos reportadas. Fix aplicado en `app/styles/index.css`: se agregó manualmente solo esa regla puntual de Preflight (`*, ::before, ::after { border-width: 0; border-style: solid; border-color: currentColor; }`), sin reactivar el resto de Preflight. `border-width: 0` por defecto asegura que no aparezcan bordes nuevos no deseados en elementos que no pidan explícitamente un ancho de borde.
- [x] **T36b** — Usuario confirmó y pidió archivar el change tras el fix de bordes (T36a).
- [x] **T37** — `apply.md` escrito; T34/T35 quedan sin marcar por la limitación de entorno documentada ahí (sin red/`node_modules` sano en este sandbox) — mismo criterio ya usado en `fix-ci-npm-ci`/`audit-pending-fixes`. Se archiva el change.

**Nota sobre integridad de archivos (hallazgo de esta sesión, no relacionado al contenido del change):** al correr `tsc` por primera vez se encontraron 63 archivos bajo `src/` (todos los tocados por esta migración en sesiones previas) con bytes nulos de relleno al final, y otros 8 archivos de `shared/ui`/`widgets` con contenido directamente cortado a mitad de archivo -- en ambos casos, un artefacto de sincronización del mount de OneDrive que usa este sandbox (confirmado comparando contra el contenido real vía la herramienta de lectura de archivos, que sí mostraba el contenido completo y correcto). Se repararon los 71 archivos afectados reescribiendo el contenido correcto; el código fuente en sí nunca estuvo mal -- solo la copia que este agente veía por `bash`. Vale la pena que el usuario confirme que sus archivos locales (fuera de este sandbox) están íntegros la próxima vez que abra el proyecto.
