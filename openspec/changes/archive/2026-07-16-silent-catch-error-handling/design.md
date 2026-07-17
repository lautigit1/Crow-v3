# Design: silent-catch-error-handling

## Inventario real vs. el número de la auditoría

La auditoría original contaba 27 patrones de `.catch` silencioso. Un `grep -rn "\.catch(" frontend/src` (excluyendo tests) en este momento de la sesión encontró 19 sitios reales en 13 archivos. La diferencia se explica por trabajo previo de esta misma sesión: la migración a TanStack Query (`entities/product/queries.ts` y componentes que la usan, como `FavoritesPage`, que ya no tiene un `.catch` propio -- TanStack Query maneja sus propios estados de error internamente). El comentario que quedó en `FavoritesPage.tsx` documentando ese cambio fue lo único que hizo "matchear" a esa página en el grep, sin ser un `.catch` real.

## Dos tratamientos distintos según el rol de los datos

No todos los `.catch` silenciosos merecen el mismo arreglo:

**1. Carga principal de una página completa** (ej. `AdminUsersPage`, `AdminBrandsPage`, `AdminAuditPage`, `AdminCategoriesPage`, `AdminInventoryPage`, `AdminQuotesPage`, `AdminSuppliersPage`, `AdminProductsPage` -- lista principal, `MyQuotesPage`): si esta carga falla, la página no tiene nada útil que mostrar de todos modos. Se agregó un estado `loadError` (boolean) que, junto con `console.error`, cambia el mensaje de "vacío" del `DataTable`/`EmptyState` de "No hay X." a "No se pudieron cargar los X. Recargá la página." (o, en `MyQuotesPage`, un botón "Reintentar" real que vuelve a llamar `load()`, siguiendo el patrón que ya usaba `AdminReportsPage` con su `error` boolean + early return).

**2. Datos de soporte / widgets secundarios** (ej. los selects de categoría/marca/proveedor en `AdminProductsPage`, los widgets de "stock bajo" y "auditoría reciente" en `DashboardPage`): si estos fallan, el resto de la página sigue siendo perfectamente usable (se puede seguir viendo/editando productos aunque el select de "Marca" quede vacío). Forzar un estado de error a nivel de página completa por un fallo en un dato secundario sería peor UX que la situación actual. Para estos, el arreglo es solo logging (`console.error` con contexto de qué falló) -- el fallback silencioso a lista vacía se mantiene, pero ahora deja rastro para debugging.

**3. Casos legítimamente silenciosos** (`entities/session/context.tsx`): un 401 en `/me` al montar la app es el caso normal para un visitante no autenticado, no un error. Se diferenció explícitamente ese caso (`err?.response?.status !== 401`) de cualquier otro fallo (red caída, 500), que sí se loguea. El logout es fire-and-forget por diseño (el estado de React ya se limpia antes de llamar al servidor) -- se agregó logging del resultado del lado servidor sin bloquear el flujo de UI.

## Por qué no un sistema de toasts

No existía ningún componente de notificación global en el codebase (`shared/ui/` no tiene `Toast`/`Alert`) -- el patrón ya establecido para errores visibles en este proyecto es un `error` de estado local + mensaje inline (usado en todos los formularios de creación/edición vía `apiError()`). Introducir una librería de toasts es una decisión de diseño de UI más grande que el alcance de este hallazgo puntual; se prefirió reusar y extender el patrón inline ya existente (`EmptyState` con mensaje distinto, o el mismo patrón boolean `error` que `AdminReportsPage` ya tenía).

## Verificación

- `npx tsc --noEmit` sobre una copia sincronizada del frontend en disco local (el mount de OneDrive es lento/flaky para estas verificaciones, patrón ya establecido en esta sesión) -- 0 errores.
- `npx eslint .` -- 0 errores (5 warnings preexistentes de `react-refresh/only-export-components`, no relacionados a este cambio).
- `npm run build` -- build de producción exitoso, sin warnings nuevos.
- `npx vitest run src/__tests__` -- 76/76 tests pasando, incluyendo `AuthProvider.test.tsx` (7 tests), que ejercita directamente el cambio en `entities/session/context.tsx` (el test "muestra loading mientras resuelve /me" sigue pasando, confirmando que el 401 esperado sigue tratándose como silencioso).
