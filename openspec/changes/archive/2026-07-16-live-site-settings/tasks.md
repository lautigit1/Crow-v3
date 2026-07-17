# Tasks: live-site-settings

## Implementation tasks

- [x] **T1** — Preguntar alcance al usuario (solo footer vs. sitio completo) antes de tocar 16 archivos -- eligió sitio completo
- [x] **T2** — Corregir `DEFAULT_SETTINGS` en `backend/app/schemas/setting.py` con los datos reales del negocio (Mendoza) en vez del placeholder genérico
- [x] **T3** — Crear `entities/settings/queries.ts` (`useSettingsQuery`, `useUpdateSettingsMutation`) siguiendo el patrón de `entities/brand/queries.ts`
- [x] **T4** — Crear `entities/settings/useSiteSettings.ts` (`useSiteSettings`, `useWaLink`, con `FALLBACK` mientras carga/si falla)
- [x] **T5** — Migrar `AdminSettingsPage.tsx` de fetch manual a `useSettingsQuery`/`useUpdateSettingsMutation` (cache compartida con el sitio público)
- [x] **T6** — Migrar los 16 archivos que usaban `contact`/`waLink` de `shared/config/contact.ts` al hook en vivo
- [x] **T7** — Eliminar `shared/config/contact.ts` (sin consumidores tras T6)
- [x] **T8** — Actualizar `CheckoutPage.test.tsx`: `QueryClientProvider` de test + handler MSW para `GET /api/settings`
- [x] **T9** — Resincronizar 18 archivos afectados por desync sandbox/OneDrive (Read → Write a archivo nuevo → `mv -f`, ver `design.md`)
- [x] **T10** — `tsc --noEmit` sin errores
- [x] **T11** — `vitest run` -- 76/76 tests pasando en frontend, sin regresiones
- [x] **T12** — `npm run build` exitoso
- [x] **T13** — `pytest` -- 258/258 tests pasando en backend (249 + 9 de `test_settings.py`), sin regresiones
