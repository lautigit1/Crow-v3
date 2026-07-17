# Tasks: frontend-data-layer-and-perf

## Implementation tasks

- [x] **T1** — Migrar fetching de catálogo, detalle de producto y favoritos a TanStack Query (`useQuery`/`useMutation`, `QueryClientProvider`)
- [x] **T2** — Memoizar el valor de contexto de `FavoritesProvider` con `useMemo` + `useCallback`
- [x] **T3** — Envolver `ProductCard` en `React.memo`
- [x] **T4** — Estabilizar props pasadas a `ProductCard` (`useCallback` en `handleQuote` de `CatalogPage.tsx` y `FavoritesPage.tsx`; fix de paso en `FeaturedProducts.tsx`)
- [x] **T5** — Tests de componente para `CartPage` (9 tests)
- [x] **T6** — Tests de componente para `CheckoutPage` con MSW real en la mutación (5 tests)
- [x] **T7** — Tests de componente para el flujo CRUD de `AdminProductsPage` (5 tests)
- [x] **T8** — `tsc --noEmit` sin errores
- [x] **T9** — `vitest run` — 76/76 tests pasando en el frontend (suite completa, sin regresiones)
