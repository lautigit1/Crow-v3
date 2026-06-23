import { EMAIL, HOURS, PHONE_DISPLAY, PHONE_TEL } from "../lib/whatsapp";

/** Thin dark bar above the header with contact info. */
export default function UtilityBar({ maxWidth = 1280 }: { maxWidth?: number }) {
  return (
    <div style={{ background: "#0A1622", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "0 40px",
          height: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26, color: "#9FB0C0", fontSize: 12.5, letterSpacing: ".01em" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 5, height: 5, background: "#0066FF", borderRadius: "50%", display: "inline-block" }} />
            Distribuidor autorizado de repuestos y lubricantes
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, color: "#C3CFDA", font: "500 12.5px/1 'IBM Plex Mono',monospace" }}>
          <a href={`tel:${PHONE_TEL}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#C3CFDA" }}>
            TEL {PHONE_DISPLAY}
          </a>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,.14)" }} />
          <a href={`mailto:${EMAIL}`} style={{ color: "#C3CFDA" }}>
            {EMAIL.toUpperCase()}
          </a>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,.14)" }} />
          <span>{HOURS.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
