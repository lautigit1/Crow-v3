import { useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Container, Button, Card } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { contact, waLink } from "@/shared/config/contact";
import { color, font } from "@/shared/config/theme";

const FAQ = [
  { q: "¿Hacen envíos?", a: "Sí. Despachamos a todo el país; coordinamos por WhatsApp según tu ubicación." },
  { q: "¿Cómo sé si tienen mi repuesto?", a: "Escribinos por WhatsApp o solicitá una cotización con tu vehículo y la pieza; te confirmamos disponibilidad." },
  { q: "¿Trabajan con talleres y flotas?", a: "Sí, manejamos condiciones especiales para taller y flota con escalas por volumen." },
  { q: "¿Las piezas tienen garantía?", a: "Cada referencia está respaldada por garantía de planta del fabricante." },
];

export function ContactPage() {
  usePageMeta("Contacto", "Contactá a Crow Repuestos por WhatsApp o cotización online. Mendoza ciudad, respuesta en menos de 1 hora.");
  const [open, setOpen] = useState(false);

  return (
    <>
      <section style={{ background: color.ink900, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(820px 320px at 85% -20%, rgba(0,87,217,.2), transparent 60%)" }} />
        <Container style={{ position: "relative", padding: "56px 40px" }}>
          <h1 style={{ fontFamily: font.display, fontSize: 42, fontWeight: 800, letterSpacing: "-.02em", color: "#fff", marginBottom: 12 }}>Contacto</h1>
          <p style={{ fontFamily: font.body, fontSize: 16, lineHeight: 1.6, color: color.textOnDark, maxWidth: 560 }}>
            Atención personalizada. Escribinos y un asesor te responde con disponibilidad y precio.
          </p>
        </Container>
      </section>

      <section style={{ background: color.surface, padding: "56px 0 90px" }}>
        <Container style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".14em", color: color.primary, marginBottom: 18 }}>DATOS DE CONTACTO</div>
              {[
                ["Teléfono", contact.phoneDisplay],
                ["Correo", contact.email],
                ["Horario", contact.hours],
                ["Ubicación", contact.city],
              ].map(([label, value], i, arr) => (
                <div key={label}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{label.toUpperCase()}</span>
                    <span style={{ fontFamily: font.body, fontSize: 16, fontWeight: 600, color: color.ink900 }}>{value}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: color.border, margin: "14px 0" }} />}
                </div>
              ))}
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <Button as="a" href={waLink()} target="_blank" rel="noreferrer" variant="whatsapp">WhatsApp</Button>
                <Button onClick={() => setOpen(true)} variant="outline">Solicitar cotización</Button>
              </div>
            </Card>
          </div>

          <div>
            <h2 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 800, color: color.ink900, marginBottom: 18 }}>Preguntas frecuentes</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FAQ.map((f) => (
                <Card key={f.q} pad={18}>
                  <div style={{ fontFamily: font.display, fontSize: 15.5, fontWeight: 700, color: color.ink900, marginBottom: 6 }}>{f.q}</div>
                  <p style={{ fontFamily: font.body, fontSize: 14, lineHeight: 1.55, color: color.textMuted }}>{f.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <QuoteModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
