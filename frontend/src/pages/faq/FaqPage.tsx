import { useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Container } from "@/shared/ui";
import { color, font } from "@/shared/config/theme";
import { waLink } from "@/shared/config/contact";

const FAQS = [
  {
    category: "Pedidos y stock",
    items: [
      {
        q: "¿Cómo sé si tienen el repuesto que necesito?",
        a: "Escribinos por WhatsApp con la marca, modelo y año de tu vehículo y el repuesto que buscás. Te confirmamos disponibilidad y precio en menos de una hora.",
      },
      {
        q: "¿Trabajan con número de parte?",
        a: "Sí. Si tenés el número de parte del fabricante, mandáselo directamente — es la forma más rápida de confirmar compatibilidad.",
      },
      {
        q: "¿Qué pasa si no encuentro el repuesto en el catálogo?",
        a: "El catálogo online no refleja el 100% del stock. Consultanos igual — tenemos acceso a referencias que no están publicadas.",
      },
    ],
  },
  {
    category: "Envíos y entrega",
    items: [
      {
        q: "¿Hacen entregas a domicilio?",
        a: "Sí. Entregamos en Mendoza ciudad el mismo día. Coordinamos horario por WhatsApp.",
      },
      {
        q: "¿Envían a otras provincias?",
        a: "Sí, despachamos a todo el país. El plazo y costo dependen de la distancia. Consultanos antes de hacer el pedido.",
      },
      {
        q: "¿Puedo retirar en el local?",
        a: "Claro. Estamos en Mendoza ciudad, de lunes a sábado de 8 a 18 hs. Avisanos antes para tener el pedido listo.",
      },
    ],
  },
  {
    category: "Garantía y devoluciones",
    items: [
      {
        q: "¿Los repuestos tienen garantía?",
        a: "Todos los productos tienen garantía de fábrica del fabricante. Sin letra chica.",
      },
      {
        q: "¿Qué hago si el repuesto no es el correcto?",
        a: "Contactanos dentro de las 48 horas. Si el error fue de nuestra parte, hacemos el cambio sin costo.",
      },
    ],
  },
  {
    category: "Clientes especiales",
    items: [
      {
        q: "¿Trabajan con talleres mecánicos?",
        a: "Sí. Tenemos condiciones especiales para talleres con compras frecuentes. Escribinos para coordinar.",
      },
      {
        q: "¿Manejan precios por volumen para flotas?",
        a: "Sí. Para flotas de empresas ofrecemos precios escalonados según volumen mensual. Consultanos.",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderBottom: `1px solid ${color.border}`,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{
          fontFamily: font.display,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-.01em",
          color: color.ink900,
          lineHeight: 1.4,
        }}>
          {q}
        </span>
        <span style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: `1.5px solid ${open ? color.primary : color.border}`,
          background: open ? color.primarySoft : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: open ? color.primary : color.textFaint,
          transition: "all .15s",
        }}>
          <svg
            width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
            style={{ transform: open ? "rotate(45deg)" : "none", transition: "transform .15s" }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>

      {open && (
        <p style={{
          fontFamily: font.body,
          fontSize: 14.5,
          lineHeight: 1.7,
          color: color.textMuted,
          margin: "0 0 20px",
          paddingRight: 40,
        }}>
          {a}
        </p>
      )}
    </div>
  );
}

export function FaqPage() {
  usePageMeta(
    "Preguntas frecuentes",
    "Respondemos las dudas más comunes sobre pedidos, envíos, garantías y atención en Crow Repuestos.",
  );

  return (
    <>
      {/* Header */}
      <section style={{ background: color.ink900, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(820px 320px at 85% -20%, rgba(0,87,217,.2), transparent 60%)",
        }} />
        <Container style={{ position: "relative", padding: "56px 40px" }}>
          <div style={{
            fontFamily: font.mono, fontSize: 10.5, fontWeight: 500,
            letterSpacing: ".16em", color: "rgba(127,176,255,.7)",
            textTransform: "uppercase", marginBottom: 16,
          }}>
            — FAQ
          </div>
          <h1 style={{
            fontFamily: font.display, fontSize: 38, fontWeight: 800,
            letterSpacing: "-.025em", color: "#fff", marginBottom: 12,
          }}>
            Preguntas frecuentes
          </h1>
          <p style={{
            fontFamily: font.body, fontSize: 16, lineHeight: 1.6,
            color: "rgba(255,255,255,.45)", maxWidth: 480, margin: 0,
          }}>
            Si no encontrás lo que buscás, escribinos por WhatsApp.
          </p>
        </Container>
      </section>

      {/* Content */}
      <section style={{ background: color.surface, padding: "64px 0 96px" }}>
        <Container>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            maxWidth: 720,
            margin: "0 auto",
            gap: 48,
          }}>
            {FAQS.map((group) => (
              <div key={group.category}>
                <div style={{
                  fontFamily: font.mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  color: color.primary,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}>
                  {group.category}
                </div>
                <div style={{ borderTop: `2px solid ${color.ink900}` }}>
                  {group.items.map((item) => (
                    <AccordionItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}

            {/* CTA */}
            <div style={{
              borderTop: `1px solid ${color.border}`,
              paddingTop: 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
            }}>
              <p style={{
                fontFamily: font.body, fontSize: 15, color: color.textMuted,
                margin: 0, lineHeight: 1.6,
              }}>
                ¿Tenés una duda que no está acá?
              </p>
              <a
                href={waLink("Hola Crow! Tengo una consulta.")}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: color.primary,
                  color: "#fff",
                  fontFamily: font.body,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "11px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                Escribinos por WhatsApp
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
