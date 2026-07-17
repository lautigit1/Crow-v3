import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi, type OrderCreate, type OrderStatus } from "./index";

export const orderKeys = {
  all: ["orders"] as const,
  mine: () => [...orderKeys.all, "mine"] as const,
  minePage: (params: { skip?: number; limit?: number }) => [...orderKeys.mine(), params] as const,
  adminAll: () => [...orderKeys.all, "admin"] as const,
  adminPage: (params: { skip?: number; limit?: number; user_id?: number }) =>
    [...orderKeys.adminAll(), params] as const,
};

export function useMyOrdersQuery(params: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: orderKeys.minePage(params),
    queryFn: () => orderApi.mine(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminOrdersQuery(params: { skip?: number; limit?: number; user_id?: number }) {
  return useQuery({
    queryKey: orderKeys.adminPage(params),
    queryFn: () => orderApi.listAll(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrderCreate) => orderApi.create(data),
    onSuccess: () => {
      // Invalida todas las páginas de "mis pedidos" -- más simple y seguro
      // que calcular a mano en qué página cae el pedido nuevo.
      queryClient.invalidateQueries({ queryKey: orderKeys.mine() });
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => orderApi.cancelMine(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.mine() });
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, admin_notes }: { id: number; status: OrderStatus; admin_notes?: string }) =>
      orderApi.updateStatus(id, status, admin_notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.adminAll() });
    },
  });
}
