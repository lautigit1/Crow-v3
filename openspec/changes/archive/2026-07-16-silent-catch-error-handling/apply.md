# Apply: silent-catch-error-handling

## Resumen

Los 19 sitios `.catch` silenciosos reales del frontend (13 archivos) ahora loguean el error real vía `console.error` con contexto, y las cargas de las que depende toda una página muestran un mensaje distinto de "no se pudo cargar" en vez de confundirse con "no hay registros". Hallazgo "Alta" #14 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `frontend/src/entities/session/context.tsx`
- `frontend/src/pages/account/MyQuotesPage.tsx`
- `frontend/src/pages/admin/AdminAuditPage.tsx`
- `frontend/src/pages/admin/AdminBrandsPage.tsx`
- `frontend/src/pages/admin/AdminCategoriesPage.tsx`
- `frontend/src/pages/admin/AdminInventoryPage.tsx`
- `frontend/src/pages/admin/AdminProductsPage.tsx`
- `frontend/src/pages/admin/AdminQuotesPage.tsx`
- `frontend/src/pages/admin/AdminReportsPage.tsx`
- `frontend/src/pages/admin/AdminSuppliersPage.tsx`
- `frontend/src/pages/admin/AdminUsersPage.tsx`
- `frontend/src/pages/admin/DashboardPage.tsx`

## Decisiones documentadas

- Tratamiento distinto según el rol del dato: carga principal de página → estado de error visible (mensaje distinto o botón reintentar); dato de soporte/widget secundario → solo logging, sin bloquear el resto de la página.
- No se agregó un sistema de toasts nuevo -- se reusó el patrón inline (`error` boolean / mensaje en `EmptyState`/`DataTable`) que la app ya usaba en otros lugares (formularios vía `apiError()`, `AdminReportsPage`).
- `entities/session/context.tsx` mantiene el 401-al-montar como silencioso (caso esperado para visitante anónimo) pero ahora distingue explícitamente ese caso de cualquier otro error, que sí se loguea.
- El número real de sitios (19) difiere del hallazgo original de la auditoría (27) porque la migración a TanStack Query hecha antes en esta misma sesión ya había eliminado varios `.catch` manuales (TanStack Query maneja sus propios estados de error). Documentado explícitamente para que no parezca un trabajo incompleto.

## Verificación

- `grep -rn "\.catch("` antes/después confirmó los 19 sitios y que todos ahora reciben `(err) =>` con `console.error`.
- `npx tsc --noEmit` -- 0 errores.
- `npx eslint .` -- 0 errores (5 warnings preexistentes de `react-refresh/only-export-components`, no relacionados).
- `npm run build` -- build de producción exitoso, sin warnings nuevos, code-splitting preservado (cada página admin sigue en su propio chunk).
- `npx vitest run src/__tests__` -- 76/76 tests pasando, incluyendo los 7 de `AuthProvider.test.tsx` que ejercitan directamente el cambio en `entities/session/context.tsx`.

## Pendiente / limitaciones

- No se agregó un sistema de notificaciones/toasts global -- si en el futuro se decide agregar uno, estos mensajes inline serían buenos candidatos para migrar a toasts en vez de mensajes de tabla vacía.
- Los widgets secundarios (selects de filtro, widgets del dashboard) siguen fallando en silencio desde la perspectiva del usuario final (solo logueado en consola) -- se consideró la opción correcta dado que forzar un estado de error de página completa por un dato secundario sería peor UX, pero es una decisión de producto que podría revisarse.
