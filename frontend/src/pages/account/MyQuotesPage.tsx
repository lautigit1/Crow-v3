import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CenteredSpinner, EmptyState, Button } from "@/shared/ui";
import { quoteApi, type Quote } from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { formatDate } from "@/shared/lib/format";
import { color, font } from "@/shared/config/theme";

export function MyQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    quoteApi.mine().then(setQuotes).catch(() => setQuotes([]));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900 }}>Mis cotizaciones</h1>

      {quotes === null ? (
        <CenteredSpinner label="Cargando…" />
      ) : quotes.length === 0 ? (
        <EmptyState
          title="Todavía no tenés cotizaciones"
          message="Cuando solicites una cotización, aparecerá acá con su estado."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      ) : (
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
      )}
    </div>
  );
}
