import { useEffect, useState } from "react";
import { DataTable, Badge, Icon, CenteredSpinner, type Column, type IconName } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { auditApi, type AuditLog } from "@/entities/audit";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

function actionMeta(action: string): { icon: IconName; tone: Tone; label: string } {
  const [entity, verb] = action.split(".");
  const map: Record<string, IconName> = {
    login: "shieldCheck",
    user: "users",
    product: "products",
    category: "categories",
    brand: "brands",
    quote: "quotes",
  };
  const tone: Tone =
    verb === "failure" || verb === "delete" || verb === "blocked"
      ? "danger"
      : verb === "create" || verb === "success" || verb === "register"
      ? "success"
      : verb === "update" || verb === "status"
      ? "warning"
      : "neutral";
  return { icon: map[entity] ?? "audit", tone, label: action };
}

export function AdminAuditPage() {
  const [items, setItems] = useState<AuditLog[] | null>(null);

  useEffect(() => {
    auditApi.list().then(setItems).catch(() => setItems([]));
  }, []);

  const columns: Column<AuditLog>[] = [
    {
      header: "Acción",
      render: (l) => {
        const m = actionMeta(l.action);
        return (
          <div className="flex items-center gap-2.5">
            <span className="text-textMuted">
              <Icon name={m.icon} size={17} />
            </span>
            <Badge tone={m.tone}>{m.label}</Badge>
          </div>
        );
      },
    },
    {
      header: "Actor",
      render: (l) => (
        <div className="font-body text-[13.5px] text-ink800">{l.actor_email ?? "—"}</div>
      ),
    },
    {
      header: "Entidad",
      render: (l) => (l.entity ? <span className="font-mono text-xs text-textFaint">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ""}</span> : "—"),
    },
    { header: "Detalle", render: (l) => <span className="text-[13px] text-textMuted">{l.detail ?? "—"}</span> },
    { header: "IP", render: (l) => <span className="font-mono text-xs text-textFaint">{l.ip_address ?? "—"}</span> },
    {
      header: "Fecha",
      align: "right",
      render: (l) => <span className="font-mono text-xs text-textFaint">{new Date(l.created_at).toLocaleString("es-CO")}</span>,
    },
  ];

  return (
    <div>
      <AdminHeader title="Auditoría" icon="audit" subtitle="Registro inmutable de eventos de seguridad y cambios." />
      {items === null ? <CenteredSpinner /> : <DataTable columns={columns} rows={items} getKey={(l) => l.id} empty="Sin eventos registrados todavía." />}
    </div>
  );
}
