import { useCallback, useEffect, useState } from "react";

const KEY = "crow.favorites";

function read(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Favorites are stored locally (per browser). The list is kept in sync across
 * components via a custom window event.
 */
export function useFavorites() {
  const [ids, setIds] = useState<number[]>(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener("crow:favorites", sync);
    return () => window.removeEventListener("crow:favorites", sync);
  }, []);

  const persist = (next: number[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("crow:favorites"));
  };

  const toggle = useCallback((id: number) => {
    const current = read();
    persist(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const isFavorite = useCallback((id: number) => ids.includes(id), [ids]);

  return { ids, toggle, isFavorite };
}
