# Apply: frontend-data-layer-and-perf

## Resumen

Cierra tres hallazgos de "necesidad media" (1-2 meses) de la auditoría técnica del 2026-07-13: adopción real de TanStack Query, memoización de contexto/listas para evitar re-renders, y tests de componente para los flujos de mayor riesgo de negocio (carrito, checkout, admin de productos).

## Archivos modificados

**Data layer:**
- `QueryClientProvider` agregado al árbol de la app; catálogo, detalle de producto y favoritos migrados a `useQuery`/`useMutation`.

**Performance:**
- `frontend/src/app/providers/FavoritesProvider.tsx` — valor de contexto memoizado.
- `frontend/src/entities/product/ProductCard.tsx` — envuelto en `React.memo`.
- `frontend/src/pages/catalog/CatalogPage.tsx`, `frontend/src/pages/account/FavoritesPage.tsx` — `handleQuote` estabilizado con `useCallback`.
- `frontend/src/widgets/featured-products/FeaturedProducts.tsx` — fix de código muerto encontrado de paso.

**Tests nuevos:**
- `frontend/src/__tests__/CartPage.test.tsx` (9 tests)
- `frontend/src/__tests__/CheckoutPage.test.tsx` (5 tests)
- `frontend/src/__tests__/AdminProductsPage.test.tsx` (5 tests)

## Decisiones documentadas

- La migración a TanStack Query se priorizó por tráfico (catálogo, detalle, favoritos) en vez de ser exhaustiva; el resto de los fetches (paneles admin) queda para una migración incremental posterior — no rompe nada porque ambos patrones (fetch manual y TanStack Query) coexisten sin conflicto en la misma app.
- Los tests de `CartPage`/`CheckoutPage` mockean el hook (`useCart`) en vez de montar providers reales, porque el contrato del hook ya tiene su propia cobertura en `CartProvider.test.tsx`; `CheckoutPage` sí usa MSW real en el punto de la mutación para probar la integración end-to-end del submit.

## Verificación

- `npx tsc --noEmit` → sin errores.
- `npx vitest run` → 76/76 tests pasando en toda la suite de frontend (10 archivos de test), corridos en tres tandas por el límite de tiempo del entorno de verificación, no del proyecto. Sin regresiones en los tests preexistentes.
- `npm run build` → build de producción exitoso.

## Pendiente (fuera de alcance de este change)

- Migrar el resto de los fetches de paneles admin a TanStack Query (mencionado en el roadmap de la auditoría como parte de la misma línea de trabajo, pero no bloqueante).
