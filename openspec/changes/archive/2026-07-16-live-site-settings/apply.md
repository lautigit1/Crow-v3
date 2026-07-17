# Apply: live-site-settings

## Resumen

Conecta el formulario de Configuración del panel admin (que ya persistía correctamente en la base) con todo el sitio público, que hasta ahora ignoraba esos datos y mostraba un archivo estático hardcodeado. Pedido directo del usuario: "quiero que [Configuración] se linkee con los que están en el footer que están hardcodeados, y que cambio que yo haga se guarde" -- el guardado ya funcionaba; lo que faltaba era la lectura en vivo del lado público.

## Archivos modificados

**Backend:**
- `backend/app/schemas/setting.py` -- `DEFAULT_SETTINGS` corregido a los datos reales del negocio (Mendoza) en vez de un placeholder genérico (CABA).

**Frontend -- nuevos:**
- `frontend/src/entities/settings/queries.ts` -- `useSettingsQuery`, `useUpdateSettingsMutation`.
- `frontend/src/entities/settings/useSiteSettings.ts` -- `useSiteSettings`, `useWaLink`.

**Frontend -- modificados:**
- `frontend/src/pages/admin/AdminSettingsPage.tsx` -- usa la cache compartida en vez de un fetch propio.
- `frontend/src/widgets/footer/Footer.tsx`, `frontend/src/widgets/navbar/Navbar.tsx`, `frontend/src/entities/product/ProductCard.tsx`, `frontend/src/pages/product/ProductDetailPage.tsx`, `frontend/src/widgets/hero/Hero.tsx`, `frontend/src/widgets/cta/CtaFinal.tsx`, `frontend/src/widgets/how-it-works/HowItWorks.tsx`, `frontend/src/pages/contact/ContactPage.tsx`, `frontend/src/pages/faq/FaqPage.tsx`, `frontend/src/pages/legal/AccesibilidadPage.tsx`, `frontend/src/pages/legal/TerminosPage.tsx`, `frontend/src/pages/legal/PrivacidadPage.tsx`, `frontend/src/pages/checkout/CheckoutPage.tsx`, `frontend/src/features/quote/QuoteModal.tsx`, `frontend/src/pages/admin/AdminQuotesPage.tsx` -- migrados al hook en vivo.
- `frontend/src/shared/lib/useIsOpenNow.ts` -- comentario actualizado (sin cambio funcional).
- `frontend/src/__tests__/CheckoutPage.test.tsx` -- `QueryClientProvider` de test + handler MSW para `/api/settings`.

**Frontend -- eliminados:**
- `frontend/src/shared/config/contact.ts` -- sin consumidores tras la migración.

## Decisiones documentadas

- Alcance decidido con el usuario vía pregunta explícita: sitio completo (16 archivos) en vez de solo el footer, para que no queden partes del sitio mostrando datos distintos ante el mismo cambio en Configuración.
- Defaults del backend corregidos antes de conectar el frontend -- conectar sin este paso hubiera arriesgado mostrar un placeholder de Buenos Aires en el sitio de un negocio en Mendoza hasta que alguien abriera el admin y guardara manualmente.
- `useIsOpenNow` (indicador "Abierto ahora") no quedó atado al texto libre del campo Horario -- parsear ese texto de forma confiable no es viable para un indicador puramente informativo; se documentó la limitación en el propio archivo.
- `contact.ts` se borró en vez de dejarlo como código muerto sin consumidores.

## Verificación

- `npx tsc --noEmit` → sin errores (tras resincronizar 18 archivos afectados por el desync sandbox/OneDrive documentado en `design.md`).
- `npx vitest run` → 76/76 tests pasando en frontend (10 archivos), incluyendo `CheckoutPage.test.tsx` ajustado para el nuevo `useQuery` interno.
- `npm run build` → build de producción exitoso.
- `pytest` (backend) → 258/258 tests pasando (249 + 9 de `test_settings.py`), sin regresiones por el cambio de defaults.
- Verificación manual del contrato: `PUT /api/settings` (admin) → `queryClient.setQueryData` → próxima lectura de `useSiteSettings()` en cualquier página ve el valor nuevo sin recargar, confirmado leyendo el flujo de `useUpdateSettingsMutation`.

## Pendiente / limitaciones

- El indicador "Abierto ahora" de la navbar sigue usando un horario fijo (lun-sáb 8-18) en vez de parsear el texto libre de Configuración -- si el horario real cambia a algo que ya no sea eso, hay que actualizar `useIsOpenNow.ts` a mano (documentado en el propio archivo).
