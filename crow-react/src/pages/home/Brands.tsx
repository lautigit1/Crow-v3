export default function Brands() {
  return (
    <section style={{ background: "#fff", padding: "80px 0", borderBottom: "1px solid #E4E8ED" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: ".7fr 1.3fr", gap: 56, alignItems: "center" }}>
        <div>
          <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", letterSpacing: ".2em", color: "#0066FF", marginBottom: 16 }}>
            MARCAS ALIADAS
          </div>
          <h2 style={{ font: "800 32px/1.1 'Archivo',sans-serif", letterSpacing: "-.01em", color: "#0A1622", marginBottom: 14 }}>
            Respaldados por los fabricantes que el sector reconoce.
          </h2>
          <p style={{ font: "400 15px/1.6 'IBM Plex Sans',sans-serif", color: "#5A6675" }}>
            Cada referencia que vendemos está respaldada por garantía de planta.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid #E4E8ED", borderLeft: "1px solid #E4E8ED" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 108,
                borderRight: "1px solid #E4E8ED",
                borderBottom: "1px solid #E4E8ED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#9AA6B3", letterSpacing: ".1em" }}>[ LOGO MARCA ]</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
