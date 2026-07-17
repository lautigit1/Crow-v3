import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "./index";

export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
};

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => categoryApi.list(),
    // El catálogo de categorías cambia rara vez (solo el admin lo edita) --
    // un staleTime más largo que el default evita refetches innecesarios al
    // navegar entre catálogo y páginas de producto.
    staleTime: 5 * 60_000,
  });
}
