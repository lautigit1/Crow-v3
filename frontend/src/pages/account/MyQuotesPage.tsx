import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, EmptyState, Button, Spinner, Icon } from "@/shared/ui";
import { quoteApi, type Quote } from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { formatDate } from "@/shared/lib/format";
import { color, font, radius } from "@/shared/config/theme";

const LIMIT = 20;

function QuoteCard({ quote }: { quote: Quote }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hov ? color.primary : color.border}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: hov ? "0 4px 18px rgba(0,87,217,.08)" : "0 1px 4px rgba(7,17,31,.04)",
      }}
    >
      {/* Top strip */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: color.surface,
        borderBottom: `1px solid ${color.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: color.primarySoft, color: color.primary,
          }}>
            <Icon name="quotes" size={13} />
          </span>
          <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: color.ink700 }}>
            # {String(quote.id).padStart(4, "0")}
          </span>
          <span style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint }}>
            {formatDate(quote.created_at)}
          </span>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {/* Body */}
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontFamily: font.body, fontSize: 14, color: color.ink800, lineHeight: 1.6, margin: 0 }}>
          {quote.message}
        </p>
        {quote.vehicle && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: font.body, fontSize: 12, color: color.textMuted }}>
            <Icon name="truck" size={12} />
            {quote.vehicle}
          </div>
        )}
        {quote.admin_reply && (
          <div style={{
            marginTop: 4, padding: "10px 14px",
            background: "#FFFBEB", border: "1px solid #FDE68A",
            borderRadius: radius.sm,
          }}>
            <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "#92400E", marginBottom: 4 }}>
              Respuesta del equipo
            </div>
            <p style={{ fontFamily: font.body, fontSize: 13, color: "#78350F", lineHeight: 1.5, margin: 0 }}>
              {quote.admin_reply}
            </p>
          </div>
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

  useEffect(() => {
    setInitialLoading(true);
    quoteApi
      .mine({ skip: 0, limit: LIMIT })
      .then((r) => { setQuotes(r.items); setTotal(r.total); })
      .catch(() => { setQuotes([]); setTotal(0); })
      .finally(() => setInitialLoading(false));
  }, []);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: color.ink900, borderRadius: 14,
        padding: "22px 28px",
        boxShadow: "0 4px 24px rgba(7,17,31,.12)",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)`,
        }} />
        <div style={{
          position: "absolute", top: -40, right: -20, width: 140, height: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,87,217,.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
              color: "#7FB0FF",
            }}>
              <Icon name="quotes" size={20} />
            </span>
            <div>
              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
                Mis cotizaciones
              </div>
              <div style={{ fontFamily: font.body, fontSize: 12.5, color: "#94A3B8", marginTop: 3 }}>
                {total > 0 ? `${total} cotización${total !== 1 ? "es" : ""} en total` : "Sin cotizaciones aún"}
              </div>
            </div>
          </div>
          <Button as={Link} to="/catalogo" variant="ghost" size="sm" style={{ color: "#94A3B8", borderColor: "rgba(255,255,255,.15)" }}>
            Ir al catálogo →
          </Button>
        </div>
      </div>

      {/* ── List ── */}
      {initialLoading ? (
        <CenteredSpinner label="Cargando…" />
      ) : quotes.length === 0 ? (
        <EmptyState
          title="Todavía no tenés cotizaciones"
          message="Cuando solicites una cotización, aparecerá acá con su estado."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {quotes.map((qt) => <QuoteCard key={qt.id} quote={qt} />)}
          </div>

          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
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
