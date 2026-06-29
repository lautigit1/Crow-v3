import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CenteredSpinner, EmptyState, Button, Spinner } from "@/shared/ui";
import { quoteApi, type Quote } from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { formatDate } from "@/shared/lib/format";
import { color, font } from "@/shared/config/theme";

const LIMIT = 20;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900 }}>
          Mis cotizaciones
        </h1>
        {total > 0 && (
          <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>
            {quotes.length} de {total}
          </span>
        )}
      </div>

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
            {quotes.map((qt) => (
              <Card key={qt.id} pad={18}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>#{qt.id}</span>
                      <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{formatDate(qt.created_at)}</span>
                    </div>
                    <p style={{ fontFamily: font.body, fontSize: 14.5, color: color.ink800, lineHeight: 1.5 }}>{qt.message}</p>
                    {qt.vehicle && <div style={{ fontFamily: font.body, fontSize: 13, color: color.textMuted, marginTop: 6 }}>Vehículo: {qt.vehicle}</div>}
                  </div>
                  <StatusBadge status={qt.status} />
                </div>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
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
