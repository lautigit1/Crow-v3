const TESTIMONIALS = [
  {
    quote: "Pido por WhatsApp y me cotizan al instante. Tienen el repuesto correcto a la primera, eso me ahorra parar el taller.",
    initials: "RM",
    name: "Ricardo Medina",
    role: "TALLER MEDINA · MECÁNICA",
  },
  {
    quote: "Manejo una flota de camiones y Crow siempre tiene stock de lo que más se gasta. Cumplen con los despachos.",
    initials: "CL",
    name: "Carolina Lozano",
    role: "TRANSPORTES LOZANO · FLOTA",
  },
  {
    quote: "Los productos de detailing son de nivel profesional. Mi moto quedó como nueva y el asesor sabía exactamente qué recomendar.",
    initials: "AS",
    name: "Andrés Suárez",
    role: "CLIENTE PARTICULAR",
  },
];

export default function Testimonials() {
  return (
    <section style={{ background: "#F4F6F8", padding: "96px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ marginBottom: 48, maxWidth: 620 }}>
          <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".2em", color: "#0066FF", marginBottom: 16 }}>
            LO QUE DICEN NUESTROS CLIENTES
          </div>
          <h2 style={{ font: "800 40px/1.07 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#0A1622" }}>
            Talleres y conductores que vuelven.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.initials} style={{ background: "#fff", border: "1px solid #E4E8ED", padding: "34px 30px", display: "flex", flexDirection: "column" }}>
              <div style={{ font: "500 16px/1 'Archivo',sans-serif", color: "#0066FF", marginBottom: 20 }}>★★★★★</div>
              <p style={{ font: "400 16px/1.6 'IBM Plex Sans',sans-serif", color: "#2B3744", flex: 1, marginBottom: 26 }}>“{t.quote}”</p>
              <div style={{ display: "flex", alignItems: "center", gap: 13, borderTop: "1px solid #E4E8ED", paddingTop: 20 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    background: "#0A1622",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "700 15px/1 'Archivo',sans-serif",
                  }}
                >
                  {t.initials}
                </span>
                <div>
                  <div style={{ font: "700 14px/1.2 'IBM Plex Sans',sans-serif", color: "#0A1622" }}>{t.name}</div>
                  <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#8A97A6", marginTop: 5 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
