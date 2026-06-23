import { useState } from "react";
import { Link } from "react-router-dom";
import Hoverable from "../../lib/Hoverable";
import Photo, { stripes, darkStripes } from "../../components/Placeholder";
import { FEATURED_FILTERS, FEATURED_PRODUCTS } from "../../data/featured";

const chipOff = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 17px",
  borderRadius: 2,
  border: "1px solid #D9DEE5",
  background: "#fff",
  color: "#3A4654",
  font: "600 13px/1 'IBM Plex Sans',sans-serif",
  letterSpacing: ".01em",
  cursor: "pointer",
  transition: ".15s",
} as const;

const chipOn = { ...chipOff, border: "1px solid #0066FF", background: "#0066FF", color: "#fff" } as const;

export default function FeaturedProducts({ onQuote }: { onQuote: () => void }) {
  const [filter, setFilter] = useState<string>("Todos");
  const products = filter === "Todos" ? FEATURED_PRODUCTS : FEATURED_PRODUCTS.filter((p) => p.cat === filter);

  return (
    <section id="productos" style={{ scrollMarginTop: 90, background: "#fff", padding: "96px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: ".78fr 2.22fr", gap: 48, alignItems: "start" }}>
          {/* left intro + featured */}
          <div style={{ position: "sticky", top: 96 }}>
            <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".2em", color: "#0066FF", marginBottom: 16 }}>
              PRODUCTOS DESTACADOS
            </div>
            <h2 style={{ font: "800 38px/1.07 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#0A1622", marginBottom: 18 }}>
              Lo que más rota en nuestro mostrador
            </h2>
            <p style={{ font: "400 15px/1.6 'IBM Plex Sans',sans-serif", color: "#5A6675", marginBottom: 26 }}>
              Filtra por categoría y solicita cotización del producto que necesites. Stock actualizado a diario.
            </p>
            <Hoverable
              as={Link}
              to="/catalogo"
              style={{ display: "inline-flex", alignItems: "center", gap: 9, font: "700 14px/1 'IBM Plex Sans',sans-serif", color: "#0066FF", marginBottom: 26 }}
              hoverStyle={{ gap: 13 }}
            >
              Ver catálogo completo<span>→</span>
            </Hoverable>
            <div style={{ border: "1px solid #E4E8ED", background: "#0A1622", color: "#fff" }}>
              <Photo label="[ FOTO · producto del mes ]" ratio={1.7} background="transparent" pattern={stripes(0.05, 14)} labelColor="rgba(255,255,255,.5)" />
              <div style={{ padding: 18 }}>
                <div style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#0066FF", letterSpacing: ".1em", marginBottom: 10 }}>
                  DESTACADO · BAT-700
                </div>
                <div style={{ font: "700 19px/1.15 'Archivo',sans-serif", marginBottom: 8 }}>Batería 12V · 70Ah</div>
                <p style={{ font: "400 13px/1.5 'IBM Plex Sans',sans-serif", color: "#9FB0C0", marginBottom: 16 }}>
                  Arranque confiable con garantía de planta. Instalación disponible.
                </p>
                <Hoverable
                  as="button"
                  onClick={onQuote}
                  style={{
                    width: "100%",
                    height: 44,
                    background: "#0066FF",
                    color: "#fff",
                    border: "none",
                    borderRadius: 2,
                    font: "700 13.5px/1 'IBM Plex Sans',sans-serif",
                    cursor: "pointer",
                  }}
                  hoverStyle={{ background: "#0a57d0" }}
                >
                  Cotizar este producto
                </Hoverable>
              </div>
            </div>
          </div>

          {/* right filter + grid */}
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 26, paddingBottom: 26, borderBottom: "1px solid #E4E8ED" }}>
              {FEATURED_FILTERS.map((label) => (
                <button key={label} onClick={() => setFilter(label)} style={label === filter ? chipOn : chipOff}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {products.map((p) => (
                <Hoverable
                  key={p.tag}
                  style={{ border: "1px solid #E4E8ED", background: "#fff", display: "flex", flexDirection: "column", transition: ".2s" }}
                  hoverStyle={{ borderColor: "#0066FF", boxShadow: "0 10px 30px rgba(10,22,34,.07)" }}
                >
                  <div
                    style={{
                      aspectRatio: "1.45",
                      background: "#F4F6F8",
                      backgroundImage: darkStripes(0.05, 13),
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      padding: 14,
                    }}
                  >
                    <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#8A97A6" }}>[ FOTO ]</span>
                    <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#0066FF", background: "#fff", border: "1px solid #E4E8ED", padding: "5px 8px" }}>
                      {p.tag}
                    </span>
                  </div>
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ font: "500 10.5px/1 'IBM Plex Mono',monospace", color: "#9AA6B3", letterSpacing: ".08em", marginBottom: 9 }}>
                      {p.brand}
                    </div>
                    <h3 style={{ font: "700 16.5px/1.2 'Archivo',sans-serif", color: "#0A1622", marginBottom: 8 }}>{p.name}</h3>
                    <p style={{ font: "400 13px/1.5 'IBM Plex Sans',sans-serif", color: "#6B7886", marginBottom: 18, flex: 1 }}>{p.blurb}</p>
                    <Hoverable
                      as="button"
                      onClick={onQuote}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 42,
                        padding: "0 16px",
                        background: "#fff",
                        border: "1px solid #D7DDE4",
                        borderRadius: 2,
                        color: "#0A1622",
                        font: "600 13px/1 'IBM Plex Sans',sans-serif",
                        cursor: "pointer",
                      }}
                      hoverStyle={{ borderColor: "#0066FF", color: "#0066FF" }}
                    >
                      Cotizar<span>→</span>
                    </Hoverable>
                  </div>
                </Hoverable>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
