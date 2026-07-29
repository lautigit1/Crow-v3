import { api } from "@/shared/api";

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

// ─── Estado del cobro ────────────────────────────────────────────────────────
// Eje independiente del estado de entrega: el cobro se coordina por WhatsApp,
// fuera del sitio. "Pagado + En proceso" y "Entregado + Sin cobrar" son los dos
// situaciones reales (ver backend/app/models/order.py).

export type PaymentStatus = "Sin cobrar" | "Link enviado" | "Pagado";

export const PAYMENT_STATUSES: PaymentStatus[] = ["Sin cobrar", "Link enviado", "Pagado"];

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  "Sin cobrar": "#94a3b8",
  "Link enviado": "#f59e0b",
  Pagado: "#22c55e",
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
  payment_status: PaymentStatus;
  notes: string | null;
  admin_notes: string | null;
  payment_method: PaymentMethod | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

export type OrderList = { items: Order[]; total: number };

/**
 * Lo que devuelve la lista del panel: `Order` más los datos del cliente y el
 * total. No se pide por separado porque la respuesta de admin ya los trae
 * (`AdminOrderRead` en el backend).
 */
export type AdminOrder = Order & {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  /** Suma de las líneas CON precio. Las de "Consultar" no entran. */
  total: number;
  /** Cuántas líneas quedaron afuera del total por no tener precio. */
  items_sin_precio: number;
};

export type AdminOrderList = { items: AdminOrder[]; total: number };

export type AdminOrderFilters = {
  skip?: number;
  limit?: number;
  user_id?: number;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  q?: string;
};

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
  listAll: (params?: AdminOrderFilters) =>
    api.get<AdminOrderList>("/orders", { params }).then((r) => r.data),
  /**
   * `payment_status` viaja solo si se pasa. Mandarlo siempre (aunque sea con
   * el valor actual) haría que un cambio de estado de entrega pise el cobro
   * con lo que la UI creía tener, que puede estar desactualizado.
   */
  updateStatus: (
    id: number,
    status: OrderStatus,
    admin_notes?: string,
    payment_status?: PaymentStatus,
  ) =>
    api
      .patch<AdminOrder>(`/orders/${id}`, { status, admin_notes, payment_status })
      .then((r) => r.data),
};

/**
 * Link de WhatsApp hacia el número DEL CLIENTE.
 *
 * `useWaLink()` (shared/lib) hace lo contrario: arma links hacia el número del
 * negocio, que sale de la configuración del sitio. Son dos direcciones opuestas
 * y mezclarlas en un solo helper es la clase de cosa que un día manda el
 * mensaje al número equivocado, así que va aparte a propósito.
 *
 * Devuelve null cuando no hay teléfono: el `phone` del usuario es opcional y
 * nadie lo pide al registrarse. La UI muestra el mail en ese caso, nunca un
 * botón que no lleva a ningún lado.
 */
export function waLinkCliente(phone: string | null, mensaje: string): string | null {
  if (!phone) return null;
  // Solo dígitos: la gente escribe "261 660-0569", "+54 9 261...", "(261)...".
  const digitos = phone.replace(/\D/g, "");
  if (digitos.length < 8) return null;
  // Sin código de país asumimos Argentina (54) y celular (9). Un número
  // guardado como "2616600569" es lo más común en la base.
  const numero = digitos.startsWith("54") ? digitos : `549${digitos}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
