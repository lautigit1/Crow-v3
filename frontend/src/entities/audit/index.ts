import { api } from "@/shared/api/client";

export type AuditLog = {
  id: number;
  actor_id: number | null;
  actor_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
};

type AuditLogList = { items: AuditLog[]; total: number };

export const auditApi = {
  list: (limit = 150) =>
    api.get<AuditLogList>("/audit", { params: { limit } }).then((r) => r.data.items),
};
