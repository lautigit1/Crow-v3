import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * `render` con un cliente de TanStack Query en contexto.
 *
 * Uno nuevo por llamada y sin reintentos: compartirlo dejaría el cache de un
 * caso filtrándose al siguiente, y el reintento por defecto haría que un test
 * de error tarde de más antes de fallar.
 */
export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
