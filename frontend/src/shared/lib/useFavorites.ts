import { useCallback, useEffect, useState } from "react";
import { favoriteApi } from "@/entities/favorite";
import { useAuth } from "@/app/providers/AuthProvider";

/**
 * Favorites backed by the API when the user is logged in.
 * Falls back to an empty state (no-op toggles) when not authenticated.
 */
export function useFavorites() {
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

  return { ids, toggle, isFavorite, loading, refresh: fetchFavorites };
}
