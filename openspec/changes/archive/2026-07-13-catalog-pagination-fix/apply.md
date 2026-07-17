# Apply: catalog-pagination-fix

## Resumen

Conecta paginación real en el catálogo público, cerrando el hallazgo crítico #1 de la auditoría del 2026-07-13: el catálogo estaba topeado a 48 productos sin forma de ver el resto.

## Archivos modificados

**Modificado:**
- `frontend/src/pages/catalog/CatalogPage.tsx` — estado `page`, constante `PAGE_SIZE`, `skip` en el fetch, wrappers de reset de página por filtro, componente `<Pagination>` reutilizado del panel admin.

## Decisiones documentadas

- Tamaño de página sin cambios (48) para no alterar la densidad visual del grid que ya existía.
- Paginación clásica (no scroll infinito) por consistencia con el resto de la app y porque el componente `Pagination` ya es código probado.
- Se evitó el helper genérico `resetTo0<T>` por un problema de tooling durante la verificación (ver `design.md`), no por una limitación real del lenguaje.

## Verificación

- `npx tsc --noEmit -p tsconfig.build.json` → sin errores.
- `npx vitest run` → 57/57 tests pasando (corridos en dos tandas: 39 + 18, por límite de tiempo del entorno de verificación, no del proyecto). Ninguno de los tests existentes cubre `CatalogPage` directamente — no se agregaron tests nuevos en este change porque el archivo no tenía cobertura previa y agregarla es un ítem de prioridad alta ya presente en el roadmap de la auditoría ("Testing de componentes de frontend para checkout, carrito y páginas de admin"), no en el alcance de este fix puntual.
- Verificación manual del flujo de estado: cambiar cualquier filtro resetea `page` a 0 en el mismo batch de React (un solo fetch, no dos), confirmado leyendo el código y el orden de dependencias del `useEffect`.

## Pendiente (fuera de alcance de este change)

- Tests de componente para `CatalogPage` (cubierto por el roadmap de mediano plazo de la auditoría).
- Cache de queries (TanStack Query) para evitar refetch redundante al paginar — roadmap de mediano plazo.
