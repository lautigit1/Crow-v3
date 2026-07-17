# Design: frontend-data-layer-and-perf

## 1 — TanStack Query en los fetches de mayor tráfico

`@tanstack/react-query` ya estaba en `package.json` sin uso real. Se envolvió la app con `QueryClientProvider` y se migraron a `useQuery`/`useMutation` los fetches de catálogo, detalle de producto y favoritos — las tres pantallas de mayor tráfico y las que más se benefician de cache entre navegaciones. El resto de los fetches (paneles de admin, de tráfico bajo y ya con sus propios patrones de loading/error) quedan para una migración incremental posterior, fuera de alcance de este change.

## 2 — Memoización: `FavoritesProvider` + `ProductCard`

**`frontend/src/app/providers/FavoritesProvider.tsx`** — el valor pasado a `FavoritesContext.Provider` se envolvió en `useMemo`, con las funciones expuestas (`toggle`, `isFavorite`, etc.) ya estables vía `useCallback` donde correspondía. Antes, cada render del provider (por ejemplo al cambiar cualquier otro estado global) creaba un objeto de contexto nuevo y forzaba a re-renderizar a todo consumidor, sin importar si los favoritos realmente habían cambiado.

**`frontend/src/entities/product/ProductCard.tsx`** — envuelto en `React.memo`. Es el componente que más se instancia en la app (una por producto en grids de catálogo/favoritos/destacados), así que es el punto de mayor retorno para evitar re-renders evitables.

**Efecto colateral necesario:** memoizar `ProductCard` solo sirve si sus props también son estables. Se revisaron los call-sites y se envolvieron en `useCallback` los handlers inline que se pasaban como prop (`handleQuote` en `CatalogPage.tsx` y `FavoritesPage.tsx`), y se corrigió además un caso de código muerto encontrado de paso en `frontend/src/widgets/featured-products/FeaturedProducts.tsx`.

## 3 — Tests de componente: carrito, checkout, admin

Patrón usado, consistente con los tests de hooks/providers ya existentes en `src/__tests__/`:

- **`CartPage.test.tsx`** (9 tests) — mockea `useCart` (`@/app/providers/CartProvider`) y `useNavigate` de `react-router-dom`. Cubre: estado vacío, render de items, stepper +/- llamando a `setQuantity`, deshabilitado al tope de stock, botón de eliminar llamando a `removeItem`, flujo de confirmación de "Vaciar carrito" (con el `ConfirmModal` real, no mockeado), cancelar sin llamar a `clear`, y navegación a `/checkout`.
- **`CheckoutPage.test.tsx`** (5 tests) — mockea `useCart`; usa MSW (`setupServer`) real para interceptar `POST /api/orders` en vez de mockear la capa de API, para probar el flujo de integración completo. Cubre: carrito vacío, habilitación del botón de confirmar según método de pago seleccionado, flujo feliz completo (verifica el body enviado, la pantalla de éxito con número de pedido, y que se llame a `clear()`), y el mensaje de error cuando el servidor responde con error.
- **`AdminProductsPage.test.tsx`** (5 tests) — mockea los módulos de entidad (`@/entities/product`, `category`, `brand`, `supplier`) vía `vi.mock` con `importActual` parcial. Cubre: render inicial, búsqueda debounced, creación de producto, y confirmación de borrado (localizando el botón de borrar dentro de la fila con `within(row)`, filtrando por el botón que no es "editar").

**Decisión:** para `CartPage`/`CheckoutPage` se mockean los providers/hooks directamente en vez de montar el árbol completo de providers reales, porque son componentes de presentación cuyo comportamiento depende del contrato del hook, no de su implementación interna (que ya tiene su propio test en `CartProvider.test.tsx`). Para `CheckoutPage` se usa MSW real en el punto de la mutación porque ahí sí interesa probar la integración fetch → parseo → UI end-to-end.
