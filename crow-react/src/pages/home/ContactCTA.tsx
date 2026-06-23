import Hoverable from "../../lib/Hoverable";
import { EMAIL, HOURS, PHONE_DISPLAY, PHONE_TEL, waLink } from "../../lib/whatsapp";

export default function ContactCTA({ onQuote }: { onQuote: () => void }) {
  return (
    <section id="contacto" style={{ scrollMarginTop: 90, background: "#0A1622", padding: "90px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(800px 400px at 80% 120%,rgba(0,102,255,.2),transparent 60%)" }} />
      <div
        style={{
          position: "relative",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 40px",
          display: "grid",
          gridTemplateColumns: "1.2fr .8fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ font: "800 46px/1.05 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#fff", marginBottom: 20 }}>
            ¿Sabes qué repuesto necesitas?
            <br />
            Cotiza en minutos.
          </h2>
          <p style={{ font: "400 17px/1.6 'IBM Plex Sans',sans-serif", color: "#A9B8C7", maxWidth: 520, marginBottom: 34 }}>
            Escríbenos por WhatsApp con tu vehículo y la pieza que buscas. Un asesor te responde con disponibilidad y
            precio al instante.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Hoverable
              as="a"
              href={waLink("Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.")}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 11,
                height: 54,
                padding: "0 28px",
                background: "#25D366",
                color: "#062a14",
                borderRadius: 2,
                font: "700 15.5px/1 'IBM Plex Sans',sans-serif",
              }}
              hoverStyle={{ background: "#1fbb59" }}
            >
              <span style={{ width: 9, height: 9, background: "#062a14", borderRadius: "50%", display: "inline-block" }} />
              Escribir por WhatsApp
            </Hoverable>
            <Hoverable
              as="button"
              onClick={onQuote}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 54,
                padding: "0 26px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,.24)",
                color: "#fff",
                borderRadius: 2,
                font: "600 15px/1 'IBM Plex Sans',sans-serif",
                cursor: "pointer",
              }}
              hoverStyle={{ borderColor: "rgba(255,255,255,.5)" }}
            >
              Formulario de cotización
            </Hoverable>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,.12)", padding: 30 }}>
          <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "#0066FF", marginBottom: 22 }}>
            CONTACTO DIRECTO
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#7E90A2" }}>TELÉFONO</span>
              <a href={`tel:${PHONE_TEL}`} style={{ font: "600 16px/1 'IBM Plex Sans',sans-serif", color: "#fff" }}>{PHONE_DISPLAY}</a>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,.1)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#7E90A2" }}>CORREO</span>
              <a href={`mailto:${EMAIL}`} style={{ font: "600 16px/1 'IBM Plex Sans',sans-serif", color: "#fff" }}>{EMAIL}</a>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,.1)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: "#7E90A2" }}>HORARIO</span>
              <span style={{ font: "600 16px/1 'IBM Plex Sans',sans-serif", color: "#fff" }}>{HOURS}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
