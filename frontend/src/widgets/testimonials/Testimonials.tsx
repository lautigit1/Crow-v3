import { Container, SectionHeading } from "@/shared/ui";
import { color, font, radius } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";

const ITEMS = [
  {
    quote:
      "Encontré el repuesto exacto en minutos. Stock real, precio justo y me lo mandaron el mismo día. No busco en otro lado.",
    name: "Martín R.",
    role: "Taller mecánico independiente",
    city: "Córdoba",
    initial: "M",
  },
  {
    quote:
      "La asesoría técnica marca la diferencia. Me ayudaron a identificar la pieza correcta para un motor que ya no fabrica nadie.",
    name: "Sofía L.",
    role: "Distribuidora automotriz",
    city: "Rosario",
    initial: "S",
  },
  {
    quote:
      "Uso Crow para toda mi flota de camiones hace dos años. Sin una sola falla en los envíos. Se los recomiendo sin dudar.",
    name: "Diego F.",
    role: "Empresa de transporte",
    city: "Buenos Aires",
    initial: "D",
  },
];

export function Testimonials() {
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: color.surface,
        padding: "96px 0",
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <Container>
        <SectionHeading
          eyebrow="LO QUE DICEN NUESTROS CLIENTES"
          title="Confianza que se construye repuesto a repuesto"
          subtitle="Talleres, distribuidoras y empresas de transporte que eligen Crow cada día."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            marginTop: 52,
          }}
        >
          {ITEMS.map((t, i) => (
            <div
              key={t.name}
              style={{
                background: "#fff",
                border: `1px solid ${color.border}`,
                borderRadius: radius.lg,
                padding: "32px 28px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 24,
                opacity: inView ? 1 : 0,
                animation: inView ? `revealScale .55s ${i * 0.12}s ease both` : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative quote mark */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 24,
                  fontFamily: "Georgia, serif",
                  fontSize: 96,
                  lineHeight: 1,
                  color: color.primarySoft,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                "
              </div>

              {/* Stars */}
              <div style={{ display: "flex", gap: 3 }}>
                {[...Array(5)].map((_, si) => (
                  <span key={si} style={{ fontSize: 14, color: "#F59E0B" }}>
                    ★
                  </span>
                ))}
              </div>

              {/* Quote text */}
              <p
                style={{
                  fontFamily: font.body,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: color.ink700,
                  fontStyle: "italic",
                  flex: 1,
                  position: "relative",
                }}
              >
                "{t.quote}"
              </p>

              {/* Author */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 20,
                  borderTop: `1px solid ${color.border}`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${color.primary} 0%, #0047B3 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: font.display,
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#fff",
                    flex: "none",
                  }}
                >
                  {t.initial}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: font.display,
                      fontSize: 14,
                      fontWeight: 700,
                      color: color.ink900,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontFamily: font.body,
                      fontSize: 12,
                      color: color.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {t.role} · {t.city}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
