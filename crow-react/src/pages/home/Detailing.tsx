import { Link } from "react-router-dom";
import Hoverable from "../../lib/Hoverable";
import Photo, { stripes } from "../../components/Placeholder";

const CARDS = [
  { title: "Shampoos pH neutro", desc: "Lavado seguro sin remover protección." },
  { title: "Ceras y selladores", desc: "Carnauba y polímeros de larga duración." },
  { title: "Recubrimiento cerámico", desc: "Protección hidrofóbica de alto brillo." },
  { title: "Cuidado de interiores", desc: "Limpiadores de tapizado, cuero y plástico." },
];

export default function Detailing() {
  return (
    <section id="detailing" style={{ scrollMarginTop: 90, background: "#0A1622", padding: "96px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(900px 400px at 15% 0,rgba(0,102,255,.14),transparent 60%)" }} />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", marginBottom: 50 }}>
          <div>
            <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".2em", color: "#0066FF", marginBottom: 16 }}>
              LÍNEA PROFESIONAL DE DETAILING
            </div>
            <h2 style={{ font: "800 42px/1.06 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#fff", marginBottom: 20 }}>
              El acabado de concesionario, en tus manos.
            </h2>
            <p style={{ font: "400 16px/1.65 'IBM Plex Sans',sans-serif", color: "#A9B8C7", marginBottom: 30, maxWidth: 480 }}>
              Shampoos pH neutro, ceras de carnauba, recubrimientos cerámicos y cuidado de interiores. Productos
              profesionales para taller de lavado y para el entusiasta exigente.
            </p>
            <Hoverable
              as={Link}
              to="/catalogo?cat=Detailing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 11,
                height: 50,
                padding: "0 26px",
                background: "#fff",
                color: "#0A1622",
                borderRadius: 2,
                font: "700 14.5px/1 'IBM Plex Sans',sans-serif",
              }}
              hoverStyle={{ background: "#E7EDF3" }}
            >
              Ver línea detailing<span>→</span>
            </Hoverable>
          </div>
          <Photo
            label="[ FOTO · auto con acabado cerámico ]"
            ratio={1.5}
            padding={20}
            style={{ border: "1px solid rgba(255,255,255,.09)" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {CARDS.map((c) => (
            <div key={c.title} style={{ background: "#11223a", border: "1px solid rgba(255,255,255,.08)" }}>
              <Photo label="[ FOTO ]" ratio={1.3} background="transparent" pattern={stripes(0.05, 13)} padding={13} />
              <div style={{ padding: 16 }}>
                <div style={{ font: "700 15px/1.15 'Archivo',sans-serif", color: "#fff", marginBottom: 5 }}>{c.title}</div>
                <div style={{ font: "400 12px/1.4 'IBM Plex Sans',sans-serif", color: "#8597A8" }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
