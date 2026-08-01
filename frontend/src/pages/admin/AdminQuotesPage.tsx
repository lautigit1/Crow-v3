import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button, DataTable, CenteredSpinner, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { QuoteSheet } from "./ui/QuoteSheet";
import { quoteApi, optionTotal, QUOTE_STATUSES, type Quote, type QuoteStatus } from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import { formatDate, formatPrice } from "@/shared/lib/format";

type Filter = "Todas" | QuoteStatus;

export function AdminQuotesPage() {
  const [items, setItems] = useState<Quote[] | null>(null);
  const [filter, setFilter] = useState<Filter>("Todas");
  const [loadError, setLoadError] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const waLink = useWaLink();

  const load = () => quoteApi.listAll().then(setItems).catch((err) => {
    console.error("[AdminQuotesPage] no se pudieron cargar las cotizaciones:", err);
    setItems([]);
    setLoadError(true);
  });
  useEffect(() => void load(), []);

  // La ficha se referencia por id y no por objeto: los endpoints de opciones
  // devuelven la cotización entera, así que guardar el objeto dejaría la ficha
  // mostrando una copia vieja mientras la tabla de atrás ya se actualizó.
  const enFicha = items?.find((q) => q.id === abierta) ?? null;

  const reemplazar = (actualizada: Quote) =>
    setItems((prev) => prev?.map((x) => (x.id === actualizada.id ? actualizada : x)) ?? null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Todas: items?.length ?? 0 };
    QUOTE_STATUSES.forEach((s) => (c[s] = items?.filter((q) => q.status === s).length ?? 0));
    return c;
  }, [items]);

  const rows = useMemo(() => (filter === "Todas" ? items ?? [] : (items ?? []).filter((q) => q.status === filter)), [items, filter]);

  const columns: Column<Quote>[] = [
    { header: "#", width: 50, render: (q) => <span className="font-mono text-xs text-textFaint">{q.id}</span> },
    {
      header: "Cliente",
      render: (q) => (
        <div>
          <strong className="text-ink900">{q.customer_name}</strong>
          {q.customer_email && <div className="font-mono text-[11px] text-textFaint">{q.customer_email}</div>}
        </div>
      ),
    },
    {
      header: "Solicitud",
      render: (q) => (
        <div className="max-w-[280px]">
          <div className="text-[13.5px] text-ink800">{q.message}</div>
          {q.vehicle && <div className="font-body text-xs text-textMuted">Vehículo: {q.vehicle}</div>}
        </div>
      ),
    },
    { header: "Fecha", render: (q) => <span className="font-mono text-xs text-textFaint">{formatDate(q.created_at)}</span> },
    {
      // Lo que se respondió, que es la columna que antes no existía: la lista
      // mostraba el estado pero no si había un precio detrás.
      header: "Cotizado",
      render: (q) =>
        q.options.length === 0 ? (
          <span className="font-body text-[12.5px] text-textFaint">Sin responder</span>
        ) : (
          <div className="whitespace-nowrap">
            <span className="font-mono text-[13px] text-ink900">
              {formatPrice(Math.min(...q.options.map(optionTotal)))}
            </span>
            {q.options.length > 1 && (
              <span className="font-body text-[11.5px] text-textFaint"> · {q.options.length} opciones</span>
            )}
          </div>
        ),
    },
    {
      header: "Estado",
      render: (q) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={q.status} />
          {q.order_id !== null && (
            <span className="font-mono text-[11px] text-textFaint">
              → pedido {String(q.order_id).padStart(5, "0")}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Gestionar",
      align: "right",
      render: (q) => (
        <div className="inline-flex gap-2 items-center">
          <Button size="sm" onClick={() => setAbierta(q.id)} aria-label={`Abrir consulta ${q.id}`}>
            Abrir
          </Button>
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

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["Todas", ...QUOTE_STATUSES] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "inline-flex items-center gap-[7px] py-2 px-3.5 rounded-full border font-body font-semibold text-[13px] cursor-pointer",
                active ? "border-primary bg-primary text-white" : "border-border bg-white text-ink700"
              )}
            >
              {f}
              <span
                className={clsx(
                  "font-mono text-[11px] py-px px-[7px] rounded-full",
                  active ? "bg-[rgba(255,255,255,.22)] text-white" : "bg-surface text-textFaint"
                )}
              >
                {counts[f] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {items === null ? <CenteredSpinner /> : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(q) => q.id}
          empty={loadError ? "No se pudieron cargar las cotizaciones. Recargá la página." : "No hay cotizaciones en este estado."}
        />
      )}

      {enFicha && (
        <QuoteSheet quote={enFicha} onClose={() => setAbierta(null)} onChange={reemplazar} />
      )}
    </div>
  );
}
