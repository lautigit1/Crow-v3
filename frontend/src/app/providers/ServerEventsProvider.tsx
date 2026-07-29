import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  ServerEventsContext,
  type ServerEvent,
  type ServerEventHandler,
  type ServerEventsContextValue,
} from "@/shared/lib/serverEvents";

/**
 * Una sola conexión SSE para toda la app.
 *
 * Deliberadamente un provider y no un hook por página: cada `EventSource`
 * abierto es una conexión viva del lado del servidor, y sobre HTTP/1.1 el
 * navegador solo permite 6 conexiones por origen. Si cada pantalla abriera la
 * suya, alguien con el panel y sus pedidos en dos pestañas gastaría varias sin
 * necesidad -- el canal es el mismo para todas.
 *
 * Ver openspec/changes/live-order-events/design.md §7.
 */
export function ServerEventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Un Set en un ref y no en estado: agregar un suscriptor no tiene que
  // re-renderizar el árbol entero, y el valor del contexto tiene que quedar
  // estable para no reconectar en cada render.
  const handlers = useRef<Set<ServerEventHandler>>(new Set());

  useEffect(() => {
    // Sin sesión no hay nada que escuchar, y el endpoint devolvería 401 en un
    // bucle de reconexión.
    if (!user) return;

    // Mismo origen: la cookie HttpOnly viaja sola. `EventSource` no permite
    // cabeceras propias, así que un esquema con token en header no funcionaría
    // acá (design §3).
    const fuente = new EventSource("/api/events");

    fuente.onmessage = (e: MessageEvent<string>) => {
      let evento: ServerEvent;
      try {
        evento = JSON.parse(e.data);
      } catch {
        // Un mensaje malformado no puede tirar abajo la conexión.
        console.warn("[eventos] mensaje ilegible:", e.data);
        return;
      }
      handlers.current.forEach((h) => h(evento));
    };

    // No se reconecta a mano a propósito: `EventSource` ya lo hace solo, con su
    // propia espera. Cerrar y reabrir acá lo único que lograría es pelearse con
    // ese mecanismo y multiplicar los intentos justo cuando el servidor está
    // caído.
    fuente.onerror = () => {
      if (fuente.readyState === EventSource.CLOSED) {
        console.warn("[eventos] conexión cerrada por el servidor");
      }
    };

    return () => fuente.close();
  }, [user]);

  const value = useRef<ServerEventsContextValue>({
    subscribe: (handler: ServerEventHandler) => {
      handlers.current.add(handler);
      return () => handlers.current.delete(handler);
    },
  }).current;

  return <ServerEventsContext.Provider value={value}>{children}</ServerEventsContext.Provider>;
}
