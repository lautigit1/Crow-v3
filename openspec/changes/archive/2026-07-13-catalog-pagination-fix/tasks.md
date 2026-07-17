# Tasks: catalog-pagination-fix

## Implementation tasks

- [x] **T1** — Agregar estado `page` y constante `PAGE_SIZE` en `CatalogPage.tsx`
- [x] **T2** — Agregar `skip: page * PAGE_SIZE` al fetch de `productApi.list()` y `page` a las deps del efecto
- [x] **T3** — Wrappers `set*Page0` para resetear `page` a 0 en cada cambio de filtro (búsqueda, categoría, marca, vehículo, stock, limpiar filtros)
- [x] **T4** — Conectar los wrappers en ambos `<FilterPanel>` (drawer mobile + sidebar desktop), en los chips activos y en el input de búsqueda del header
- [x] **T5** — Renderizar `<Pagination>` debajo del grid de resultados cuando `total > PAGE_SIZE`
- [x] **T6** — `tsc --noEmit -p tsconfig.build.json` sin errores
- [x] **T7** — `vitest run` — 57/57 tests pasando, sin regresiones (corridos en dos tandas por límite de tiempo del sandbox, no del proyecto)
