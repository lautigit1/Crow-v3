import { api } from "@/shared/api/client";

export type OrderStatus =
  | "Pendiente"
  | "Confirmado"
  | "En proceso"
  | "Enviado"
  | "Entregado"
  | "Cancelado";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pendiente",
  "Confirmado",
  "En proceso",
  "Enviado",
  "Entregado",
  "Cancelado",
];

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  Pendiente: "#f59e0b",
  Confirmado: "#3b82f6",
  "En proceso": "#8b5cf6",
  Enviado: "#06b6d4",
  Entregado: "#22c55e",
  Cancelado: "#ef4444",
};

export type OrderItem = {
  id: number;
  product_id: number | null;
  sku_snapshot: string;
  name_snapshot: string;
  unit_price_snapshot: number | null;
  quantity: number;
};

export type Order = {
  id: number;
  user_id: number;
  status: OrderStatus;
  notes: string | null;
  admin_notes: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

export type OrderList = { items: Order[]; total: number };

export type OrderItemInput = { product_id: number; quantity: number };
export type OrderCreate = { notes?: string | null; items: OrderItemInput[] };

export const orderApi = {
  mine: (params?: { skip?: number; limit?: number }) =>
    api.get<OrderList>("/orders/me", { params }).then((r) => r.data),
  myDetail: (id: number) =>
    api.get<Order>(`/orders/me/${id}`).then((r) => r.data),
  create: (data: OrderCreate) =>
    api.post<Order>("/orders", data).then((r) => r.data),
  // Admin
  listAll: (params?: { skip?: number; limit?: number; user_id?: number }) =>
    api.get<OrderList>("/orders", { params }).then((r) => r.data),
  updateStatus: (id: number, status: OrderStatus, admin_notes?: string) =>
    api.patch<Order>(`/orders/${id}`, { status, admin_notes }).then((r) => r.data),
};
