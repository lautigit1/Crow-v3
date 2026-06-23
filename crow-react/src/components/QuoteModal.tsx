import { useEffect, useState, type FormEvent } from "react";
import Hoverable from "../lib/Hoverable";
import { waLink } from "../lib/whatsapp";

type QuoteModalProps = {
  open: boolean;
  onClose: () => void;
  /** Optional pre-filled "what you need" text (e.g. a specific product). */
  initialDetalle?: string;
};

const inputStyle = {
  height: 46,
  padding: "0 14px",
  border: "1px solid #D7DDE4",
  borderRadius: 2,
  font: "400 15px/1 'IBM Plex Sans',sans-serif",
  color: "#0A1622",
  outline: "none",
} as const;

const labelStyle = {
  font: "600 12px/1 'IBM Plex Mono',monospace",
  letterSpacing: ".06em",
  color: "#5A6675",
} as const;

const focusStyle = { borderColor: "#0066FF" } as const;

/** WhatsApp quote modal shared by the landing and catalog pages. */
export default function QuoteModal({ open, onClose, initialDetalle = "" }: QuoteModalProps) {
  const [nombre, setNombre] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [detalle, setDetalle] = useState(initialDetalle);

  // Reseed the "what you need" field whenever the modal is (re)opened.
  useEffect(() => {
    if (open) setDetalle(initialDetalle);
  }, [open, initialDetalle]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const texto = `Hola Crow Repuestos, soy ${nombre}. Vehiculo: ${vehiculo}. Necesito: ${detalle}`;
    window.open(waLink(texto), "_blank");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(7,15,24,.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeUp .25s ease both",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: 2, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,.5)" }}
      >
        <div style={{ background: "#0A1622", padding: "26px 30px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".14em", color: "#0066FF", marginBottom: 12 }}>
              SOLICITAR COTIZACIÓN
            </div>
            <div style={{ font: "800 24px/1.1 'Archivo',sans-serif", color: "#fff" }}>Cuéntanos qué necesitas</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              border: "1px solid rgba(255,255,255,.2)",
              background: "transparent",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              borderRadius: 2,
              flex: "none",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: "28px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={labelStyle}>NOMBRE</label>
            <Hoverable
              as="input"
              name="nombre"
              required
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e: { target: { value: string } }) => setNombre(e.target.value)}
              style={inputStyle}
              focusStyle={focusStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={labelStyle}>VEHÍCULO (MARCA · MODELO · AÑO)</label>
            <Hoverable
              as="input"
              name="vehiculo"
              required
              placeholder="Ej. Toyota Hilux 2019"
              value={vehiculo}
              onChange={(e: { target: { value: string } }) => setVehiculo(e.target.value)}
              style={inputStyle}
              focusStyle={focusStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={labelStyle}>QUÉ NECESITAS</label>
            <Hoverable
              as="textarea"
              name="detalle"
              required
              rows={3}
              placeholder="Repuesto, producto o referencia que buscas"
              value={detalle}
              onChange={(e: { target: { value: string } }) => setDetalle(e.target.value)}
              style={{ ...inputStyle, height: "auto", padding: "12px 14px", lineHeight: 1.5, resize: "none" }}
              focusStyle={focusStyle}
            />
          </div>
          <Hoverable
            as="button"
            type="submit"
            style={{
              height: 50,
              background: "#25D366",
              color: "#062a14",
              border: "none",
              borderRadius: 2,
              font: "700 15px/1 'IBM Plex Sans',sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
            hoverStyle={{ background: "#1fbb59" }}
          >
            <span style={{ width: 9, height: 9, background: "#062a14", borderRadius: "50%", display: "inline-block" }} />
            Enviar por WhatsApp
          </Hoverable>
          <p style={{ font: "400 12px/1.5 'IBM Plex Sans',sans-serif", color: "#8A97A6", textAlign: "center" }}>
            Se abrirá WhatsApp con tu mensaje listo para enviar.
          </p>
        </form>
      </div>
    </div>
  );
}
