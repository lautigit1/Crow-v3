import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, EmptyState, Button, Spinner, Icon } from "@/shared/ui";
import { quoteApi, optionTotal, type Quote } from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { formatDate, formatPrice } from "@/shared/lib/format";
import { AccountPageHeader } from "./ui/AccountPageHeader";

const LIMIT = 20;

// `hov` used to be tracked in JS purely to swap a static border-color/
// box-shadow pair -- both are native `hover:` now.
function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden transition-[border-color,box-shadow] duration-150 shadow-[0_1px_4px_rgba(7,17,31,.04)] hover:border-primary hover:shadow-[0_4px_18px_rgba(0,87,217,.08)]">
      {/* Top strip */}
      <div className="flex items-center justify-between py-3 px-[18px] bg-surface border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[7px] shrink-0 flex items-center justify-center bg-primarySoft text-primary">
            <Icon name="quotes" size={13} />
          </span>
          <span className="font-mono text-[11px] font-bold text-ink700">
            # {String(quote.id).padStart(4, "0")}
          </span>
          <span className="font-body text-xs text-textFaint">
            {formatDate(quote.created_at)}
          </span>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {/* Body */}
      <div className="py-3.5 px-[18px] flex flex-col gap-2">
        <p className="font-body text-sm text-ink800 leading-[1.6] m-0">
          {quote.message}
        </p>
        {quote.vehicle && (
          <div className="flex items-center gap-1.5 font-body text-xs text-textMuted">
            <Icon name="truck" size={12} />
            {quote.vehicle}
          </div>
        )}
        {/* La respuesta. Reemplaza al bloque que leía `admin_reply`, un campo
            que el backend nunca devolvió: la caja amarilla "Respuesta del
            equipo" no se mostró jamás, y el cliente no tenía forma de ver lo
            que le habíamos cotizado. */}
        {quote.options.length > 0 && (
          <div className="mt-1 border border-border rounded-md overflow-hidden">
            <div className="py-2 px-3.5 bg-primarySoft font-body text-[12px] font-semibold text-primary">
              {quote.options.length === 1 ? "Lo que te cotizamos" : "Opciones que te ofrecemos"}
            </div>
            {quote.options.map((op) => (
              <div
                key={op.id}
                className="flex items-start justify-between gap-3 py-2.5 px-3.5 border-t border-border"
              >
                <div className="min-w-0">
                  <div className="font-body text-[13.5px] font-semibold text-ink900">{op.title}</div>
                  {op.detail && (
                    <div className="font-body text-[12.5px] text-textMuted leading-snug">{op.detail}</div>
                  )}
                  {op.lead_time && (
                    <div className="inline-flex items-center gap-1.5 mt-1 font-body text-xs text-textMuted">
                      <Icon name="clock" size={12} />
                      {op.lead_time}
                    </div>
                  )}
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="font-mono text-[13.5px] text-ink900">
                    {formatPrice(optionTotal(op))}
                  </div>
                  {/* El unitario solo cuando hay más de uno: con cantidad 1
                      repetiría el mismo número dos veces. */}
                  {op.quantity > 1 && (
                    <div className="font-body text-[11.5px] text-textFaint">
                      {op.quantity} × {formatPrice(op.unit_price)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Los precios se coordinan por WhatsApp: no hay "aceptar" en el
                sitio, así que decirlo evita que alguien espere un botón. */}
            {quote.order_id === null && (
              <div className="py-2.5 px-3.5 border-t border-border font-body text-[12.5px] text-textMuted">
                Escribinos por WhatsApp para confirmar cuál querés.
              </div>
            )}
          </div>
        )}

        {quote.order_id !== null && (
          <Link
            to="/cuenta/pedidos"
            className="inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-primary no-underline hover:underline"
          >
            <Icon name="box" size={13} />
            Ver el pedido N.º {String(quote.order_id).padStart(5, "0")}
          </Link>
        )}
      </div>
    </div>
  );
}

export function MyQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setInitialLoading(true);
    setLoadError(false);
    quoteApi
      .mine({ skip: 0, limit: LIMIT })
      .then((r) => { setQuotes(r.items); setTotal(r.total); })
      .catch((err) => {
        console.error("[MyQuotesPage] no se pudieron cargar las cotizaciones:", err);
        setQuotes([]);
        setTotal(0);
        setLoadError(true);
      })
      .finally(() => setInitialLoading(false));
  };

  useEffect(() => { load(); }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await quoteApi.mine({ skip: quotes.length, limit: LIMIT });
      setQuotes((prev) => [...prev, ...r.items]);
      setTotal(r.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = quotes.length < total;

  return (
    <div className="flex flex-col gap-5">

      <AccountPageHeader
        icon="quotes"
        title="Mis cotizaciones"
        subtitle={total > 0 ? `${total} cotización${total !== 1 ? "es" : ""} en total` : "Sin cotizaciones aún"}
        action={
          /* Ghost-variant override needs to reliably beat the variant's own
             text/border classes -- kept as `style` passthrough, same
             reasoning as the admin toggle buttons. */
          <Button as={Link} to="/catalogo" variant="ghost" size="sm" style={{ color: "#8AA3BC", borderColor: "rgba(255,255,255,.15)" }}>
            Ir al catálogo →
          </Button>
        }
      />

      {/* ── List ── */}
      {initialLoading ? (
        <CenteredSpinner label="Cargando…" />
      ) : loadError ? (
        <EmptyState
          icon={<Icon name="alert" size={24} />}
          title="No se pudieron cargar tus cotizaciones"
          message="Ocurrió un error de conexión. Probá de nuevo."
          action={<Button onClick={load}>Reintentar</Button>}
        />
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={<Icon name="quotes" size={24} />}
          title="Todavía no tenés cotizaciones"
          message="Cuando solicites una cotización, aparecerá acá con su estado."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {quotes.map((qt) => <QuoteCard key={qt.id} quote={qt} />)}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Spinner size={14} /> : null}
                {loadingMore ? "Cargando…" : `Cargar más (${total - quotes.length} restantes)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
