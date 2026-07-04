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

export type PaymentMethod =
  | "Transferencia"
  | "Mercado Pago"
  | "Tarjeta"
  | "Retiro en local (efectivo)";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Transferencia",
  "Mercado Pago",
  "Tarjeta",
  "Retiro en local (efectivo)",
];

// Mercado Pago todavía no está configurado como pasarela real -- por ahora
// es una opción más que el cliente elige, el cobro se coordina igual que
// transferencia/efectivo (ver nota en backend/app/models/order.py).
export const PAYMENT_METHOD_HINT: Record<PaymentMethod, string> = {
  Transferencia: "Te pasamos el CBU/alias para transferir.",
  "Mercado Pago": "Te enviamos el link de pago por WhatsApp.",
  Tarjeta: "Coordinamos el cobro con tarjeta al confirmar.",
  "Retiro en local (efectivo)": "Pagás en efectivo al retirar el pedido.",
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
  payment_method: PaymentMethod | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

export type OrderList = { items: Order[]; total: number };

export type OrderItemInput = { product_id: number; quantity: number };
export type OrderCreate = {
  notes?: string | null;
  payment_method?: PaymentMethod | null;
  items: OrderItemInput[];
};

export const orderApi = {
  mine: (params?: { skip?: number; limit?: number }) =>
    api.get<OrderList>("/orders/me", { params }).then((r) => r.data),
  myDetail: (id: number) =>
    api.get<Order>(`/orders/me/${id}`).then((r) => r.data),
  create: (data: OrderCreate) =>
    api.post<Order>("/orders", data).then((r) => r.data),
  cancelMine: (id: number) =>
    api.patch<Order>(`/orders/me/${id}/cancel`).then((r) => r.data),
  // Admin
  listAll: (params?: { skip?: number; limit?: number; user_id?: number }) =>
    api.get<OrderList>("/orders", { params }).then((r) => r.data),
  updateStatus: (id: number, status: OrderStatus, admin_notes?: string) =>
    api.patch<Order>(`/orders/${id}`, { status, admin_notes }).then((r) => r.data),
};
