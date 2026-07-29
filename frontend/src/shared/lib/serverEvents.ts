import { createContext, useContext, useEffect, useRef } from "react";

/**
 * Contexto y hook del canal de eventos.
 *
 * Van en un archivo aparte del provider porque la regla de Fast Refresh exige
 * que un archivo de componentes exporte solo componentes -- mismo criterio que
 * `entities/session`, donde el contexto vive separado de la pantalla.
 */

export type ServerEvent = { type: string; order_id?: number };

export type ServerEventHandler = (evento: ServerEvent) => void;

export type ServerEventsContextValue = {
  /** Registra un handler y devuelve la función para darlo de baja. */
  subscribe: (handler: ServerEventHandler) => () => void;
};

export const ServerEventsContext = createContext<ServerEventsContextValue | null>(null);

/**
 * Ejecuta `handler` con cada evento del servidor.
 *
 * El handler se guarda en un ref adentro para que quien lo use no tenga que
 * memoizarlo: si no, cada render lo daría de baja y lo volvería a registrar.
 */
export function useServerEvent(handler: ServerEventHandler): void {
  const ctx = useContext(ServerEventsContext);
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe((evento) => ref.current(evento));
  }, [ctx]);
}
