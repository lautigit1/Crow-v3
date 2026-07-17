# Tasks: silent-catch-error-handling

- [x] **T1** — `grep -rn "\.catch("` en `frontend/src` (excluyendo tests) para inventariar los sitios reales -- 19 en 13 archivos
- [x] **T2** — `entities/session/context.tsx`: distinguir 401 esperado (silencioso) de errores inesperados (logueados) en `fetchMe`; loguear resultado del `logout` fire-and-forget
- [x] **T3** — `pages/account/MyQuotesPage.tsx`: agregar `loadError` + botón "Reintentar" real (`load()` extraído de un `useEffect` inline)
- [x] **T4** — `pages/admin/AdminAuditPage.tsx`: `loadError` + mensaje distinto en `empty` de `DataTable`
- [x] **T5** — `pages/admin/AdminBrandsPage.tsx`: ídem
- [x] **T6** — `pages/admin/AdminCategoriesPage.tsx`: ídem
- [x] **T7** — `pages/admin/AdminInventoryPage.tsx`: ídem
- [x] **T8** — `pages/admin/AdminQuotesPage.tsx`: ídem
- [x] **T9** — `pages/admin/AdminSuppliersPage.tsx`: ídem (incluye `total` reseteado a 0 también logueado)
- [x] **T10** — `pages/admin/AdminUsersPage.tsx`: ídem
- [x] **T11** — `pages/admin/AdminProductsPage.tsx`: logging en las 3 cargas de soporte (categorías/marcas/proveedores para selects) sin bloquear la página; `loadError` en la carga principal de productos (tabs activos y eliminados)
- [x] **T12** — `pages/admin/AdminReportsPage.tsx`: agregar `console.error` al `catch` existente (ya tenía manejo visible vía `error` boolean)
- [x] **T13** — `pages/admin/DashboardPage.tsx`: `console.error` en la carga principal (stats+analytics, ya visible) y en los 2 widgets secundarios (stock bajo, auditoría reciente), sin bloquear el dashboard si estos fallan
- [x] **T14** — Verificar `grep -rn "\.catch("` de nuevo -- confirmar que los 19 sitios ahora reciben `(err) =>` y loguean
- [x] **T15** — `npx tsc --noEmit` sobre copia local sincronizada del frontend -- 0 errores
- [x] **T16** — `npx eslint .` -- 0 errores (5 warnings preexistentes no relacionados)
- [x] **T17** — `npm run build` -- build de producción exitoso
- [x] **T18** — `npx vitest run src/__tests__` -- 76/76 tests pasando, incluyendo `AuthProvider.test.tsx`
