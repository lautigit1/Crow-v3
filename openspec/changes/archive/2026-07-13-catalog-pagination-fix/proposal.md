# Proposal: catalog-pagination-fix

## What

Conectar la paginación real en el catálogo público (`CatalogPage.tsx`). El fetch al backend estaba hardcodeado a `limit: 48` sin `skip` y sin ningún control de "página siguiente" en la UI, pese a que el backend ya soporta `skip`/`limit` y el componente `Pagination` ya existe y se usa en el panel admin.

## Why

- **Hallazgo crítico de la auditoría del 2026-07-13** (`Auditoria_Tecnica_Crow_Repuestos_v3.docx`, sección 5.2): si el catálogo tiene más de 48 productos en cualquier combinación de filtros, los clientes no pueden ver ni comprar el resto. No es un problema de performance a futuro — es un bug funcional que limita ventas desde el primer día de producción.
- El fix es de bajo esfuerzo porque toda la infraestructura ya existe: la API acepta `skip`, y `shared/ui/Pagination.tsx` ya está probado en producción en tres páginas de admin.

## Non-goals

- No se agrega scroll infinito ni virtualización de listas — paginación clásica con el mismo componente que ya usa el admin, por consistencia.
- No se toca el backend (ya soporta `skip`/`limit` correctamente).
- No se resuelve la ausencia de cache de queries en el frontend (TanStack Query) — eso es un change de mediano plazo aparte, señalado en el roadmap de la auditoría.

## Success criteria

- Con más de 48 productos activos en el catálogo (o en cualquier combinación de filtros), aparece un control de paginación debajo del grid y permite navegar a las páginas siguientes.
- Cambiar cualquier filtro (búsqueda, categoría, marca, vehículo, stock) o limpiar filtros vuelve a la página 0 en el mismo ciclo de request — no se dispara un fetch extra ni queda "atascado" en una página fuera de rango.
- El contador de resultados ("N productos") sigue reflejando el `total` real devuelto por la API, no la cantidad de items de la página actual.
- `tsc --noEmit` y la suite de tests de frontend (`vitest run`) pasan sin regresiones.
