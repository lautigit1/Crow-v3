import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { favoriteApi } from "@/entities/favorite";
import { useAuth } from "@/entities/session";

/**
 * Favoritos respaldados por la API cuando hay sesión iniciada.
 * Sin sesión: estado vacío y los toggles no hacen nada.
 *
 * Antes esto vivía como un hook plano (`shared/lib/useFavorites.ts`) sin
 * Context: cada componente que lo llamaba (ProductCard, ProductDetailPage,
 * FavoritesPage) tenía su PROPIA copia de `ids`/`toggle`, sin ninguna
 * relación entre sí. Sacar un favorito desde la propia página de
 * Favoritos actualizaba solo el estado local de esa tarjeta -- la página
 * nunca se enteraba y seguía mostrando el producto ya sacado. Ahora es un
 * Context compartido (mismo patrón que CartProvider): un solo estado,
 * todos los componentes lo ven al toque.
 */

type FavoritesContextValue = {
  ids: number[];
  toggle: (id: number) => Promise<void>;
  isFavorite: (id: number) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setIds([]);
      return;
    }
    setLoading(true);
    try {
      const data = await favoriteApi.list();
      setIds(data.product_ids);
    } catch {
      setIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggle = useCallback(
    async (id: number) => {
      if (!user) return;
      const isFav = ids.includes(id);
      // Optimistic update
      setIds((prev) => (isFav ? prev.filter((x) => x !== id) : [...prev, id]));
      try {
        if (isFav) {
          await favoriteApi.remove(id);
        } else {
          await favoriteApi.add(id);
        }
      } catch {
        // Revert on error
        setIds((prev) => (isFav ? [...prev, id] : prev.filter((x) => x !== id)));
      }
    },
    [user, ids],
  );

  const isFavorite = useCallback((id: number) => ids.includes(id), [ids]);

  // Sin memoizar, este objeto es literal nuevo en cada render de
  // FavoritesProvider -- cualquier componente que use `useFavorites()` (y
  // via useContext) re-renderiza aunque `ids`/`loading` no hayan cambiado,
  // cada vez que el provider se re-renderiza por cualquier motivo (ej. un
  // cambio de estado en AuthProvider, que está arriba en el árbol). Con
  // useMemo, la referencia del value solo cambia cuando alguna de sus
  // dependencias reales cambia.
  const value = useMemo(
    () => ({ ids, toggle, isFavorite, loading, refresh: fetchFavorites }),
    [ids, toggle, isFavorite, loading, fetchFavorites],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return ctx;
}
