# Design: live-site-settings

## Backend: defaults reales, endpoint ya existente sin cambios de forma

`backend/app/api/routes/settings.py` (sin cambios de comportamiento): `GET /api/settings` es público y devuelve `DEFAULT_SETTINGS` mezclado con las filas guardadas en la tabla `settings` (clave/valor); `PUT /api/settings` es admin-only, hace update parcial (`exclude_unset`) y registra un `audit.record(action="settings.update", ...)`.

Lo único que cambió fue `backend/app/schemas/setting.py`: `DEFAULT_SETTINGS` tenía valores placeholder (`+54 11 2345-6789`, `Av. Corrientes 1234 · CABA, Argentina`) que no correspondían al negocio real (Mendoza). Como no hay ninguna fila de `Setting` seedeada (`seed.py` no las crea), una instalación nueva -- o la actual, si nunca se guardó nada desde el admin -- devolvía ese placeholder. Se corrigieron a los valores reales (mismos que tenía hardcodeados `shared/config/contact.ts`) para que conectar el sitio público a este endpoint no muestre información incorrecta antes de que un admin abra Configuración y guarde.

## Frontend: `useSiteSettings()` / `useWaLink()`, TanStack Query

`frontend/src/entities/settings/queries.ts` (nuevo) sigue el mismo patrón ya establecido para brand/category (`entities/brand/queries.ts`): `useSettingsQuery()` envuelve `settingsApi.get` en `useQuery` con `staleTime: 5min` (dato público de bajo cambio). Se agregó también `useUpdateSettingsMutation()`, que en `onSuccess` hace `queryClient.setQueryData(settingsKeys.all, updated)` -- así el guardado desde `AdminSettingsPage` actualiza la misma cache que lee el resto del sitio, sin depender de que venza el `staleTime` para que se vea el cambio.

`frontend/src/entities/settings/useSiteSettings.ts` (nuevo): `useSiteSettings()` envuelve `useSettingsQuery()` y devuelve siempre un objeto completo (nunca `undefined`), usando una constante `FALLBACK` (los mismos valores reales) mientras la request está en vuelo o si falla -- evita que el sitio muestre un estado vacío/roto en el primer render o ante un error de red. `useWaLink()` arma el link de `wa.me` a partir de `whatsapp_number` en vivo, reemplazando la función pura que antes vivía en `shared/config/contact.ts`.

`frontend/src/pages/admin/AdminSettingsPage.tsx`: migrado de `useEffect` + `settingsApi.get()` manual a `useSettingsQuery()`/`useUpdateSettingsMutation()` -- mismo query que el resto del sitio, para que el guardado invalide/actualice la cache compartida en vez de una copia local aislada.

## Migración de los 16 consumidores

Cada archivo que importaba `{ contact, waLink }` de `shared/config/contact.ts` pasó a llamar `useSiteSettings()`/`useWaLink()` dentro del componente (son hooks, así que solo se pueden usar en el cuerpo de un componente de función -- en los casos donde el uso original estaba en una constante a nivel de módulo, como `CONTACT_ITEMS` en `CtaFinal.tsx`, se movió adentro del componente). Nombres de campo renombrados de camelCase a snake_case (`phoneDisplay` → `phone_display`, `whatsappNumber` → `whatsapp_number`) para que coincidan con el schema real del backend; `contact.city` (solo existía en el frontend, no tenía equivalente en el backend) se mapeó a `contact.address` (el campo "Dirección / ubicación" del formulario de Configuración cubre el mismo rol).

Archivos tocados: `Footer.tsx`, `Navbar.tsx` (`MoreSheet`), `ProductCard.tsx`, `ProductDetailPage.tsx`, `Hero.tsx`, `CtaFinal.tsx`, `HowItWorks.tsx`, `ContactPage.tsx`, `FaqPage.tsx`, `AccesibilidadPage.tsx`, `TerminosPage.tsx`, `PrivacidadPage.tsx`, `CheckoutPage.tsx` (`SummaryPanel` y `OrderSuccess`), `QuoteModal.tsx`, `AdminQuotesPage.tsx`. `useIsOpenNow.ts` no se tocó funcionalmente (ver Non-goals) pero se actualizó el comentario para no seguir apuntando al archivo eliminado.

`frontend/src/shared/config/contact.ts` quedó sin ningún consumidor tras la migración -- se eliminó en vez de dejarlo como código muerto (justo el tipo de cosa que un audit de "fuente de verdad duplicada" señalaría).

## Tests: `CheckoutPage.test.tsx` necesitó ajustes

`CheckoutPage` (vía `SummaryPanel`/`OrderSuccess`) ahora llama `useSiteSettings()`, que usa `useQuery` internamente -- el test existente renderizaba `<CheckoutPage />` sin `QueryClientProvider` en el árbol (ninguno de los componentes bajo test hasta este momento usaba TanStack Query) y con `server.listen({ onUnhandledRequest: "error" })`, que hubiera hecho fallar cualquier request a `/api/settings` no registrada explícitamente. Se agregó un `QueryClientProvider` con un `QueryClient` de test (`retry: false`) envolviendo el render, y un handler base de MSW (`http.get("/api/settings", ...)`) devolviendo datos de settings fijos, agregado directamente en el `setupServer(...)` inicial (no en un test individual) para que esté disponible en los 5 tests del archivo.

## Problema de entorno recurrente durante la implementación

Al escribir estos cambios se repitió el problema de desincronización entre el canal de herramientas de archivo (Read/Write/Edit, autoritativo) y lo que ve la shell del sandbox montada sobre la carpeta sincronizada con OneDrive -- confirmado esta vez sobre 18 archivos de golpe (todos los tocados en esta tanda), no solo uno o dos como en sesiones anteriores. `tsc --noEmit` reportaba errores de sintaxis JSX (tags sin cerrar, "Unterminated string literal") en archivos que, leídos con la herramienta `Read`, estaban completos y bien formados. Se resolvió con el mismo patrón ya documentado en cambios anteriores: por cada archivo afectado, `Read` (fuente de verdad) → `Write` a un archivo nuevo en el mismo directorio → `mv -f` para reemplazar el original → verificación con `wc -l`. Confirmado con una corrida limpia de `tsc --noEmit` después de resincronizar los 18 archivos.
