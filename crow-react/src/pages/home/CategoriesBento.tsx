import { Link } from "react-router-dom";
import Hoverable from "../../lib/Hoverable";
import { stripes } from "../../components/Placeholder";

type SmallCard = {
  num: string;
  title: string;
  desc: string;
  cat: string;
  background: string;
};

const SMALL_CARDS: SmallCard[] = [
  { num: "02", title: "Camiones", desc: "Repuestos de carga pesada y línea diésel.", cat: "Camiones", background: "#fff" },
  { num: "03", title: "Motos", desc: "Transmisión, frenos y mantenimiento.", cat: "Motos", background: "#fff" },
  { num: "04", title: "Lubricantes", desc: "Aceites sintéticos y minerales.", cat: "Lubricantes", background: "#F4F6F8" },
  { num: "05", title: "Baterías", desc: "Energía confiable para todo arranque.", cat: "Baterías", background: "#F4F6F8" },
  { num: "06", title: "Filtros", desc: "Aceite, aire, combustible y cabina.", cat: "Filtros", background: "#fff" },
];

function FeatureCard({
  num,
  title,
  desc,
  cat,
  background,
  overlay,
}: {
  num: string;
  title: string;
  desc: string;
  cat: string;
  background: string;
  overlay: string;
}) {
  return (
    <Hoverable
      as={Link}
      to={`/catalogo?cat=${encodeURIComponent(cat)}`}
      style={{
        gridColumn: "span 2",
        position: "relative",
        background,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 26,
        transition: ".2s",
      }}
      hoverStyle={{ transform: "translateY(-3px)" }}
    >
      <div style={{ position: "absolute", inset: 0, backgroundImage: overlay }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#0066FF", letterSpacing: ".1em" }}>{num}</span>
        <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "rgba(255,255,255,.4)" }}>[ FOTO ]</span>
      </div>
      <div style={{ position: "relative" }}>
        <h3 style={{ font: "800 26px/1 'Archivo',sans-serif", color: "#fff", marginBottom: 8 }}>{title}</h3>
        <p style={{ font: "400 13.5px/1.5 'IBM Plex Sans',sans-serif", color: "#9FB0C0", maxWidth: 300 }}>{desc}</p>
      </div>
    </Hoverable>
  );
}

function SmallCategoryCard({ num, title, desc, cat, background }: SmallCard) {
  return (
    <Hoverable
      as={Link}
      to={`/catalogo?cat=${encodeURIComponent(cat)}`}
      style={{
        position: "relative",
        background,
        border: "1px solid #E4E8ED",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 22,
        transition: ".2s",
      }}
      hoverStyle={{ borderColor: "#0066FF", transform: "translateY(-3px)" }}
    >
      <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#0066FF" }}>{num}</span>
      <div>
        <h3 style={{ font: "700 18px/1.1 'Archivo',sans-serif", color: "#0A1622", marginBottom: 6 }}>{title}</h3>
        <p style={{ font: "400 12.5px/1.4 'IBM Plex Sans',sans-serif", color: "#6B7886" }}>{desc}</p>
      </div>
    </Hoverable>
  );
}

export default function CategoriesBento() {
  return (
    <section id="categorias" style={{ scrollMarginTop: 90, background: "#fff", padding: "96px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, marginBottom: 46 }}>
          <div>
            <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".2em", color: "#0066FF", marginBottom: 16 }}>
              CATÁLOGO POR CATEGORÍA
            </div>
            <h2 style={{ font: "800 42px/1.06 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#0A1622", maxWidth: 620 }}>
              Encuentra exactamente lo que tu vehículo necesita
            </h2>
          </div>
          <p style={{ font: "400 15.5px/1.6 'IBM Plex Sans',sans-serif", color: "#5A6675", maxWidth: 330 }}>
            Ocho líneas de producto organizadas para que llegues al repuesto correcto sin perder tiempo.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridAutoRows: "218px", gap: 14 }}>
          <FeatureCard
            num="01"
            title="Repuestos para Autos"
            desc="Frenos, motor, suspensión, embrague y eléctricos para vehículos livianos."
            cat="Autos"
            background="#0A1622"
            overlay={stripes(0.04, 15)}
          />
          {SMALL_CARDS.slice(0, 5).map((c) => (
            <SmallCategoryCard key={c.num} {...c} />
          ))}
          <FeatureCard
            num="07"
            title="Lavado y Detailing"
            desc="Shampoos, ceras, cerámicos y línea profesional de cuidado."
            cat="Detailing"
            background="#0E1E30"
            overlay={`radial-gradient(500px 200px at 90% 0,rgba(0,102,255,.18),transparent 60%),${stripes(0.04, 15)}`}
          />
          <SmallCategoryCard
            num="08"
            title="Accesorios"
            desc="Confort, seguridad y equipamiento."
            cat="Accesorios"
            background="#fff"
          />
        </div>
      </div>
    </section>
  );
}
