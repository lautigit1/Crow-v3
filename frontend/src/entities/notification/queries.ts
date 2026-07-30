import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "./index";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: { unread_only?: boolean; skip?: number; limit?: number }) =>
    [...notificationKeys.all, "list", params] as const,
  unread: () => [...notificationKeys.all, "unread"] as const,
};

/**
 * El contador del badge.
 *
 * `staleTime` corto pero **sin sondeo**: quien lo mantiene fresco es el evento
 * `notification.created` del canal SSE, que lo invalida en el momento. Poner un
 * `refetchInterval` acá sería pedirle a cada pestaña abierta que consulte cada
 * N segundos algo que el servidor ya sabe avisar.
 */
export function useUnreadCountQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: notificationApi.unreadCount,
    staleTime: 15_000,
    // Sin sesión el endpoint devuelve 401. Sin este `enabled`, cada visitante
    // anónimo generaría un 401 por carga de página -- ruido en los logs y una
    // request que nunca puede servir para nada.
    enabled,
  });
}

export function useNotificationsQuery(
  params: { unread_only?: boolean; limit?: number } = {},
  opciones: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.list(params),
    // La lista se pide solo cuando el panel está abierto: no tiene sentido
    // traerla en cada carga de página para un panel que puede no abrirse nunca.
    enabled: opciones.enabled ?? true,
  });
}

export function useMarkReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => {
      // Invalida todo el árbol: cambió una fila de la lista y el contador.
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: (data) => {
      // El contador se escribe directo con lo que devolvió el servidor (0) en
      // vez de esperar el refetch: es el número que la persona está mirando en
      // el momento de apretar.
      queryClient.setQueryData(notificationKeys.unread(), data.unread);
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
