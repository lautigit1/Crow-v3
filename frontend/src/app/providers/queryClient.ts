import { QueryClient } from "@tanstack/react-query";

/**
 * Cliente único de TanStack Query para toda la app.
 *
 * Hallazgo de "necesidad media" de la auditoría técnica del 2026-07-13: el
 * fetching de datos era 100% manual (useEffect + useState + axios en cada
 * página) -- sin cache, sin deduplicación de requests en vuelo, y sin retry
 * automático ante una falla de red transitoria. Navegar de vuelta a una
 * página ya visitada repetía el fetch entero, aunque los datos no hubieran
 * cambiado.
 *
 * `staleTime` de 30s: suficiente para que navegar catálogo -> producto ->
 * volver al catálogo no dispare un refetch inmediato, sin llegar a mostrar
 * datos desactualizados por mucho tiempo en un catálogo que un admin puede
 * estar editando en otra pestaña.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
