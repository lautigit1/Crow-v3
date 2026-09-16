import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/entities/session";
import { api } from "@/shared/api/client";
import {
  ServerEventsContext,
  type ServerEvent,
  type ServerEventHandler,
  type ServerEventsContextValue,
} from "@/shared/lib/serverEvents";

// Cuánto se espera antes de intentar reabrir el canal después de que el
// servidor lo cierra. Creciente hasta el tope, para no golpear una API que
// está caída.
const ESPERA_INICIAL_MS = 2_000;
const ESPERA_MAXIMA_MS = 60_000;

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

    let vigente = true;
    let fuente: EventSource | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let espera = ESPERA_INICIAL_MS;

    // Por qué existe todo esto y no alcanza con el reintento propio de
    // `EventSource`:
    //
    // El servidor ahora corta el stream cuando vence el access token con el
    // que se abrió, o cuando esa sesión se revoca (ver `routes/events.py`) --
    // sin eso, cerrar sesión no cerraba el canal y una pestaña vieja seguía
    // recibiendo eventos con una sesión ya muerta.
    //
    // `EventSource` reconecta solo cuando el stream termina, pero si la
    // reconexión recibe un 401 el navegador la da por fallida DEFINITIVA:
    // `readyState` queda en CLOSED y no vuelve a intentar nunca. Y ese es
    // justo el caso normal de una pestaña quieta media hora -- el access
    // token venció y no hubo ninguna otra llamada que disparara el refresh
    // del interceptor. El canal quedaba mudo hasta recargar la página, sin
    // ningún síntoma visible.
    //
    // Entonces: antes de reabrir se toca la API una vez. Esa llamada pasa por
    // el interceptor de `client.ts`, que ante un 401 renueva las cookies y
    // reintenta. Si vuelve bien, la sesión está viva y el canal se reabre con
    // el token nuevo; si falla, se espera más y se prueba de nuevo, hasta que
    // `AuthProvider` note que ya no hay sesión y este efecto se desmonte.
    //
    // El sondeo NO puede ser `/auth/me`, que sería lo primero que uno
    // escribe: el interceptor saltea todo lo que tenga `/auth/` en la URL
    // (ver `client.ts`), así que un 401 ahí no renueva nada y esto quedaría
    // reintentando para siempre sin arreglar nunca lo único que hay que
    // arreglar. `unread-count` sirve porque pide sesión igual, es un COUNT
    // sobre índice, y sí pasa por el refresh.
    const reabrirMasTarde = () => {
      if (!vigente) return;
      temporizador = setTimeout(async () => {
        if (!vigente) return;
        try {
          await api.get("/notifications/unread-count");
        } catch {
          espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
          reabrirMasTarde();
          return;
        }
        // La espera NO se reinicia acá, aunque el sondeo haya salido bien: se
        // reinicia en `onopen`, cuando la conexión de verdad quedó abierta.
        //
        // La diferencia importa desde que el servidor puede responder 429 por
        // tope de streams simultáneos (ver `core/sse_limit.py`). En ese caso
        // el sondeo sale 200 -- la sesión está perfecta, lo que sobra son
        // pestañas -- y reiniciar la espera ahí dejaría esto reintentando cada
        // dos segundos para siempre contra un endpoint que va a seguir
        // diciendo que no.
        espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
        conectar();
      }, espera);
    };

    function conectar() {
      if (!vigente) return;

      // Mismo origen: la cookie HttpOnly viaja sola. `EventSource` no permite
      // cabeceras propias, así que un esquema con token en header no
      // funcionaría acá (design §3).
      fuente = new EventSource("/api/events");

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

      // Único lugar donde se perdona el backoff: la conexión quedó abierta,
      // así que lo que sea que estaba mal se arregló.
      fuente.onopen = () => {
        espera = ESPERA_INICIAL_MS;
      };

      fuente.onerror = () => {
        // Solo CLOSED. Mientras `EventSource` siga en CONNECTING está usando
        // su propio reintento, que para un corte de red es mejor que
        // cualquier cosa que hagamos acá: pelearle solo multiplica intentos
        // justo cuando el servidor está caído.
        if (fuente?.readyState === EventSource.CLOSED) {
          console.warn("[eventos] conexión cerrada por el servidor");
          fuente.close();
          fuente = null;
          reabrirMasTarde();
        }
      };
    }

    conectar();

    return () => {
      vigente = false;
      clearTimeout(temporizador);
      fuente?.close();
    };
  }, [user]);

  const value = useRef<ServerEventsContextValue>({
    subscribe: (handler: ServerEventHandler) => {
      handlers.current.add(handler);
      return () => handlers.current.delete(handler);
    },
  }).current;

  return <ServerEventsContext.Provider value={value}>{children}</ServerEventsContext.Provider>;
}
