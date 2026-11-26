import { createContext, useContext } from "react";

/**
 * Contrato de favoritos: el Context y el hook viven acá, en `shared`, sin
 * depender de nada del dominio. La implementación (API + sesión) está en
 * `app/providers/FavoritesProvider`, que es quien llena este Context.
 *
 * Así las capas de abajo (ProductCard en `entities`, las páginas) pueden
 * usar `useFavorites()` sin importar "hacia arriba" desde `app`.
 */
export type FavoritesContextValue = {
  ids: number[];
  toggle: (id: number) => Promise<void>;
  isFavorite: (id: number) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return ctx;
}
