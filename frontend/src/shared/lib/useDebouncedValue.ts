import { useEffect, useState } from "react";

/**
 * Devuelve una copia "atrasada" de `value` que solo se actualiza después de
 * `delayMs` sin cambios. Usado para no disparar un fetch (vía TanStack
 * Query) en cada tecla de un input de búsqueda -- la query solo corre
 * cuando el usuario deja de tipear.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
