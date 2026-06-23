const STATS = [
  { value: "25", label: "AÑOS DE\nEXPERIENCIA" },
  { value: "12.000+", label: "PRODUCTOS\nDISPONIBLES" },
  { value: "8.500+", label: "CLIENTES\nSATISFECHOS" },
  { value: "40+", label: "MARCAS\nALIADAS" },
];

export default function StatsBar() {
  return (
    <section style={{ background: "#0066FF", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
        {STATS.map((s) => (
          <div key={s.value} style={{ borderLeft: "1px solid rgba(255,255,255,.28)", paddingLeft: 22 }}>
            <div style={{ font: "900 50px/1 'Archivo',sans-serif", color: "#fff" }}>{s.value}</div>
            <div
              style={{
                font: "500 12.5px/1.4 'IBM Plex Mono',monospace",
                color: "rgba(255,255,255,.85)",
                marginTop: 12,
                letterSpacing: ".04em",
                whiteSpace: "pre-line",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
