import { api } from "@/shared/api";
import type { IconName } from "@/shared/ui";

export type NotificationType =
  | "Estado del pedido"
  | "Cobro del pedido"
  | "Cotización respondida";

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  /** Ruta relativa del frontend, no URL absoluta. */
  link: string | null;
  /** `null` = no leída. */
  read_at: string | null;
  created_at: string;
};

export type NotificationList = {
  items: Notification[];
  total: number;
  unread: number;
};

/**
 * Ícono y color por tipo.
 *
 * Vive en el frontend y no en la base a propósito: es una decisión de
 * presentación y tiene que poder cambiar sin una migración. La base guarda qué
 * clase de hecho ocurrió, no cómo se dibuja.
 */
export const NOTIFICATION_ICON: Record<NotificationType, IconName> = {
  "Estado del pedido": "cart",
  "Cobro del pedido": "check",
  "Cotización respondida": "message",
};

export const NOTIFICATION_COLOR: Record<NotificationType, string> = {
  "Estado del pedido": "#0057D9",
  "Cobro del pedido": "#15803D",
  "Cotización respondida": "#8b5cf6",
};

export const notificationApi = {
  list: (params?: { unread_only?: boolean; skip?: number; limit?: number }) =>
    api.get<NotificationList>("/notifications", { params }).then((r) => r.data),
  unreadCount: () =>
    api.get<{ unread: number }>("/notifications/unread-count").then((r) => r.data.unread),
  markRead: (id: number) =>
    api.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    api.patch<{ unread: number }>("/notifications/read-all").then((r) => r.data),
};

/** "hace 5 min", "hace 2 h", "ayer". Sin librería: es una sola función. */
export function haceCuanto(iso: string): string {
  const segundos = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return "recién";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
