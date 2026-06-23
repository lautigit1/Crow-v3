import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, DataTable, Select, CenteredSpinner, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { quoteApi, QUOTE_STATUSES, type Quote, type QuoteStatus } from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { waLink } from "@/shared/config/contact";
import { formatDate } from "@/shared/lib/format";
import { color, font, radius } from "@/shared/config/theme";

type Filter = "Todas" | QuoteStatus;

export function AdminQuotesPage() {
  const [items, setItems] = useState<Quote[] | null>(null);
  const [filter, setFilter] = useState<Filter>("Todas");

  const load = () => quoteApi.listAll().then(setItems).catch(() => setItems([]));
  useEffect(() => void load(), []);

  const changeStatus = async (q: Quote, status: QuoteStatus) => {
    const updated = await quoteApi.setStatus(q.id, status);
    setItems((prev) => prev?.map((x) => (x.id === q.id ? updated : x)) ?? null);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { Todas: items?.length ?? 0 };
    QUOTE_STATUSES.forEach((s) => (c[s] = items?.filter((q) => q.status === s).length ?? 0));
    return c;
  }, [items]);

  const rows = useMemo(() => (filter === "Todas" ? items ?? [] : (items ?? []).filter((q) => q.status === filter)), [items, filter]);

  const columns: Column<Quote>[] = [
    { header: "#", width: 50, render: (q) => <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{q.id}</span> },
    {
      header: "Cliente",
      render: (q) => (
        <div>
          <strong style={{ color: color.ink900 }}>{q.customer_name}</strong>
          {q.customer_email && <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{q.customer_email}</div>}
        </div>
      ),
    },
    {
      header: "Solicitud",
      render: (q) => (
        <div style={{ maxWidth: 280 }}>
          <div style={{ fontSize: 13.5, color: color.ink800 }}>{q.message}</div>
          {q.vehicle && <div style={{ fontFamily: font.body, fontSize: 12, color: color.textMuted }}>Vehículo: {q.vehicle}</div>}
        </div>
      ),
    },
    { header: "Fecha", render: (q) => <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{formatDate(q.created_at)}</span> },
    { header: "Estado", render: (q) => <StatusBadge status={q.status} /> },
    {
      header: "Cambiar / contactar",
      align: "right",
      render: (q) => (
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 150 }}>
            <Select value={q.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => changeStatus(q, e.target.value as QuoteStatus)} style={{ height: 38, fontSize: 13 }}>
              {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {q.customer_phone && (
            <Button as="a" href={waLink(`Hola ${q.customer_name}, sobre tu cotización en Crow Repuestos…`)} target="_blank" rel="noreferrer" variant="whatsapp" size="sm">
              WA
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Cotizaciones" icon="quotes" subtitle="Solicitudes de clientes y su seguimiento." />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["Todas", ...QUOTE_STATUSES] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: radius.pill,
                border: `1px solid ${active ? color.primary : color.border}`,
                background: active ? color.primary : "#fff",
                color: active ? "#fff" : color.ink700,
                fontFamily: font.body,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {f}
              <span style={{ fontFamily: font.mono, fontSize: 11, padding: "1px 7px", borderRadius: 999, background: active ? "rgba(255,255,255,.22)" : color.surface, color: active ? "#fff" : color.textFaint }}>
                {counts[f] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {items === null ? <CenteredSpinner /> : <DataTable columns={columns} rows={rows} getKey={(q) => q.id} empty="No hay cotizaciones en este estado." />}
    </div>
  );
}
