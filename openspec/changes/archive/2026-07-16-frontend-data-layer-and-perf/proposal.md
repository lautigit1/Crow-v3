# Proposal: frontend-data-layer-and-perf

## What

Tres hallazgos de "necesidad media" de la auditoría técnica del 2026-07-13, todos sobre la capa de datos y performance del frontend:

1. Migrar el fetching manual (`useEffect` + `useState` + fetch directo a `productApi`/etc.) a TanStack Query, ya instalado como dependencia pero subutilizado.
2. Evitar renders innecesarios: memoizar el valor de contexto de `FavoritesProvider` y envolver `ProductCard` en `React.memo`.
3. Agregar tests de componente para las páginas de carrito, checkout y un flujo de admin — sección con cobertura cero pese a que el resto del frontend sí tiene tests.

## Why

- **TanStack Query**: sin cache ni deduplicación de requests, navegar entre catálogo/detalle/favoritos repetía fetches idénticos y no había manejo uniforme de loading/error/retry. La librería ya estaba en `package.json` sin usarse en ningún lado.
- **Memoización**: `FavoritesProvider` recreaba su objeto de contexto en cada render, lo que forzaba a re-renderizar a todo consumidor del contexto (incluye `ProductCard` en cada card del catálogo) aunque los favoritos no hubieran cambiado.
- **Tests de componente**: `CartPage`, `CheckoutPage` y el flujo CRUD de `AdminProductsPage` son los tres puntos donde un bug silencioso tiene el impacto de negocio más directo (carrito roto = ventas perdidas), y no tenían ni un test.

## Non-goals

- No se migra el 100% de los fetches del frontend a TanStack Query en este change — se prioriza catálogo, detalle de producto y favoritos (los de mayor tráfico); páginas admin de menor uso quedan con su patrón actual para una migración incremental posterior.
- No se agrega `React.memo` de forma generalizada a todos los componentes — solo donde el profiling/inspección de código mostró re-renders evitables reales (`ProductCard`, consumido en listas grandes).
- No se persigue 100% de cobertura de tests de componente — se cubren los tres flujos de mayor riesgo, no cada página.

## Success criteria

- Navegar catálogo → detalle → volver al catálogo no dispara un refetch de la misma página si los datos siguen frescos (cache de TanStack Query).
- Togglear un favorito no re-renderiza cards de producto no relacionadas con ese toggle.
- `vitest run` incluye tests nuevos para `CartPage`, `CheckoutPage` y `AdminProductsPage` cubriendo estado vacío, flujo feliz y al menos un caso de error/confirmación, todos en verde.
- `tsc --noEmit` sin errores.
