const FEATURES = [
  { num: "01", title: "Catálogo amplio", desc: "Miles de referencias para autos, camiones y motos en un mismo proveedor." },
  { num: "02", title: "Asesoría experta", desc: "Te ayudamos a identificar la pieza exacta por modelo, año y motor." },
  { num: "03", title: "Marcas confiables", desc: "Trabajamos solo con fabricantes reconocidos y repuesto original." },
  { num: "04", title: "Precios competitivos", desc: "Condiciones para taller y flota, con escalas por volumen." },
  { num: "05", title: "Respuesta rápida", desc: "Cotizamos por WhatsApp en minutos y despachamos el mismo día." },
  { num: "06", title: "Atención personalizada", desc: "Un mismo asesor acompaña tu compra de principio a fin." },
];

export default function WhyChoose() {
  return (
    <section id="nosotros" style={{ scrollMarginTop: 90, background: "#F4F6F8", padding: "96px 0", borderTop: "1px solid #E4E8ED" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 64 }}>
        <div>
          <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".2em", color: "#0066FF", marginBottom: 16 }}>
            POR QUÉ CROW
          </div>
          <h2 style={{ font: "800 40px/1.08 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#0A1622", marginBottom: 22 }}>
            Una distribuidora que responde como un socio, no como un mostrador.
          </h2>
          <p style={{ font: "400 16px/1.65 'IBM Plex Sans',sans-serif", color: "#5A6675", marginBottom: 30 }}>
            Dos décadas y media abasteciendo talleres, flotas y conductores. Sabemos que un repuesto a tiempo es un
            vehículo que no deja de trabajar.
          </p>
          <div style={{ borderTop: "1px solid #DDE3E9", paddingTop: 24, display: "flex", gap: 40 }}>
            <div>
              <div style={{ font: "900 34px/1 'Archivo',sans-serif", color: "#0066FF" }}>12k+</div>
              <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#6B7886", marginTop: 8 }}>REFERENCIAS</div>
            </div>
            <div>
              <div style={{ font: "900 34px/1 'Archivo',sans-serif", color: "#0A1622" }}>40+</div>
              <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#6B7886", marginTop: 8 }}>MARCAS</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #DDE3E9", borderLeft: "1px solid #DDE3E9" }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              style={{
                padding: "30px 28px",
                borderRight: "1px solid #DDE3E9",
                // last two cells have no bottom border (they are the final row)
                borderBottom: i < 4 ? "1px solid #DDE3E9" : "none",
                background: "#fff",
              }}
            >
              <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#0066FF", marginBottom: 16 }}>{f.num}</div>
              <h3 style={{ font: "700 18px/1.2 'Archivo',sans-serif", color: "#0A1622", marginBottom: 9 }}>{f.title}</h3>
              <p style={{ font: "400 13.5px/1.55 'IBM Plex Sans',sans-serif", color: "#6B7886" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
