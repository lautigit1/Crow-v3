import { Link } from "react-router-dom";
import Hoverable from "../../lib/Hoverable";
import Photo, { stripes } from "../../components/Placeholder";
import { CATEGORIES } from "../../data/catalog";

export default function Hero({ onQuote }: { onQuote: () => void }) {
  return (
    <section id="inicio" style={{ scrollMarginTop: 90, background: "#0A1622", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(180deg,rgba(10,22,34,0) 60%,rgba(10,22,34,.6)),radial-gradient(1100px 500px at 78% -10%,rgba(0,102,255,.16),transparent 60%)",
        }}
      />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.08fr .92fr",
            gap: 56,
            alignItems: "center",
            padding: "74px 0 60px",
            minHeight: 560,
          }}
        >
          {/* left copy */}
          <div style={{ animation: "fadeUp .7s ease both" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 14px",
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 2,
                marginBottom: 26,
              }}
            >
              <span style={{ width: 6, height: 6, background: "#0066FF", display: "block", transform: "rotate(45deg)" }} />
              <span style={{ font: "500 11.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".16em", color: "#AEBECD" }}>
                25 AÑOS EN EL SECTOR AUTOMOTRIZ
              </span>
            </div>
            <h1 style={{ font: "800 56px/1.04 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#fff", marginBottom: 22 }}>
              Todo para tu vehículo
              <br />
              en un solo lugar.
            </h1>
            <p style={{ font: "400 18px/1.6 'IBM Plex Sans',sans-serif", color: "#A9B8C7", maxWidth: 520, marginBottom: 34 }}>
              Repuestos, lubricantes, baterías y productos de detailing para autos, camiones y motos. Marcas originales,
              stock real y asesoría técnica que entiende tu vehículo.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 38 }}>
              <Hoverable
                as="button"
                onClick={onQuote}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 11,
                  height: 52,
                  padding: "0 28px",
                  background: "#0066FF",
                  color: "#fff",
                  border: "none",
                  borderRadius: 2,
                  font: "700 15px/1 'IBM Plex Sans',sans-serif",
                  cursor: "pointer",
                }}
                hoverStyle={{ background: "#0a57d0" }}
              >
                Solicitar cotización
                <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
              </Hoverable>
              <Hoverable
                as={Link}
                to="/catalogo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 52,
                  padding: "0 26px",
                  border: "1px solid rgba(255,255,255,.22)",
                  borderRadius: 2,
                  color: "#E7EDF3",
                  font: "600 15px/1 'IBM Plex Sans',sans-serif",
                }}
                hoverStyle={{ borderColor: "rgba(255,255,255,.5)" }}
              >
                Ver catálogo
              </Hoverable>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                color: "#8597A8",
                font: "500 12.5px/1 'IBM Plex Mono',monospace",
                letterSpacing: ".03em",
              }}
            >
              {["Marcas originales", "Stock disponible", "Asesoría técnica"].map((t) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#0066FF" }}>◆</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* right layered visual */}
          <div style={{ position: "relative", animation: "fadeUp .9s ease both" }}>
            <Photo
              label="[ FOTO · camioneta / taller — formato apaisado ]"
              ratio={4 / 3.2}
              padding={22}
              style={{ border: "1px solid rgba(255,255,255,.09)" }}
            />
            <div
              style={{
                position: "absolute",
                left: -34,
                bottom: -30,
                width: "54%",
                background: "#11223a",
                border: "1px solid rgba(255,255,255,.1)",
                boxShadow: "0 24px 60px rgba(0,0,0,.4)",
              }}
            >
              <Photo label="[ FOTO · producto ]" ratio={1.5} background="transparent" pattern={stripes(0.05, 14)} padding={14} labelColor="rgba(255,255,255,.5)" />
              <div style={{ padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ font: "700 13.5px/1.1 'IBM Plex Sans',sans-serif", color: "#fff" }}>Aceite Sintético 5W-30</div>
                  <div style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#0066FF", letterSpacing: ".08em", marginTop: 6 }}>
                    OIL-530 · EN STOCK
                  </div>
                </div>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    border: "1px solid rgba(255,255,255,.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                  }}
                >
                  →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* category strip */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", display: "grid", gridTemplateColumns: "repeat(8,1fr)" }}>
          {CATEGORIES.map((cat, i) => (
            <Hoverable
              key={cat}
              as={Link}
              to={`/catalogo?cat=${encodeURIComponent(cat)}`}
              style={{
                padding: "22px 16px",
                borderRight: i < CATEGORIES.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 9,
                transition: ".18s",
              }}
              hoverStyle={{ background: "rgba(255,255,255,.03)" }}
            >
              <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#0066FF" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ font: "600 13px/1.2 'IBM Plex Sans',sans-serif", color: "#D5DEE7" }}>{cat}</span>
            </Hoverable>
          ))}
        </div>
      </div>
    </section>
  );
}
