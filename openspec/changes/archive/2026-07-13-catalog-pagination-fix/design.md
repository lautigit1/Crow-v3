# Design: catalog-pagination-fix

## Fix — Paginación real en el catálogo público

**Archivo:** `frontend/src/pages/catalog/CatalogPage.tsx`

**Problema:** el `useEffect` que llama a `productApi.list()` mandaba `limit: 48` fijo, sin `skip`. El estado `total` se trackeaba y se mostraba ("N productos") pero nunca se usaba para paginar — no había forma de acceder a los productos más allá del primer bloque de 48.

**Enfoque — mismo patrón que `AdminProductsPage.tsx`:**

1. Constante `PAGE_SIZE = 48` (mismo tamaño de página que tenía antes, para no cambiar el comportamiento visual del grid).
2. Nuevo estado `const [page, setPage] = useState(0)`.
3. El fetch ahora manda `skip: page * PAGE_SIZE, limit: PAGE_SIZE`, y `page` se agrega al arreglo de dependencias del `useEffect` debounced.
4. Wrappers `setQPage0`, `setCategoryIdPage0`, `setBrandIdPage0`, `setVehicleTypePage0`, `setInStockPage0` que setean el filtro y resetean `page` a 0 en el mismo tick de React (mismo batch de estado), para que el efecto dispare un único fetch por cambio de filtro en vez de dos (uno por el filtro, otro por el reset de página). `clearFilters` también resetea `page`.
5. Los dos `<FilterPanel>` (drawer mobile y sidebar desktop), los chips activos (`activeChips`) y el input de búsqueda del header ahora usan estos wrappers en vez de los setters crudos.
6. Se renderiza `<Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />` debajo del grid de productos, solo cuando `total > PAGE_SIZE` (no se muestra si todo el catálogo entra en una sola página — evita ruido visual con catálogos chicos).

**Decisión descartada:** no se usó una versión genérica `resetTo0<T>(setter)` (como sí existe en `AdminProductsPage.tsx`) porque en un primer intento de refactor introdujo un desajuste de sincronización entre el editor de archivos y el sistema de archivos visible por la shell de verificación (el archivo quedaba con contenido truncado en la copia que corría `tsc`), lo que generaba errores de parseo JSX que en realidad no existían en el archivo real. Para simplificar la depuración se optó por 5 funciones wrapper explícitas y no genéricas — funcionalmente equivalentes, más verbosas pero sin ambigüedad de sintaxis TSX (`<T,>`).

**No se tocó:** `backend`, tipos de `entities/product` (ya soportaban `skip`), ni `shared/ui/Pagination.tsx` (reutilizado tal cual).
