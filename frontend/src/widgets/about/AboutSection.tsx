import { color, font } from "@/shared/config/theme";
import { Container } from "@/shared/ui";
import { useInView } from "@/shared/lib/useInView";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const SPECS = [
  { label: "Rubro",     value: "Repuestos · Lubricantes · Detailing" },
  { label: "Ciudad",    value: "Mendoza capital, Argentina" },
  { label: "Horario",   value: "Lun–Sáb · 08:00 a 18:00 hs" },
  { label: "Vehículos", value: "Autos · Motos · Camiones" },
  { label: "Entrega",   value: "El mismo día en Mendoza ciudad" },
  { label: "Garantía",  value: "De fábrica en todos los productos" },
];

export function AboutSection() {
  const [ref, inView] = useInView();
  const { isMobile } = useBreakpoint();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: "#fff",
        borderTop: `1px solid ${color.border}`,
        padding: isMobile ? "64px 0" : "104px 0",
      }}
    >
      <Container>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 48 : 96,
          alignItems: "start",
        }}>

          {/* Left — ficha técnica */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              animation: inView ? "reveal .6s ease both" : "none",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
              paddingBottom: 16,
              borderBottom: `2px solid ${color.ink900}`,
            }}>
              <span style={{
                fontFamily: font.display,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".18em",
                color: color.ink900,
                textTransform: "uppercase",
              }}>
                Ficha técnica
              </span>
              <span style={{
                fontFamily: font.mono,
                fontSize: 10,
                color: color.textFaint,
                letterSpacing: ".08em",
              }}>
                CRW-001
              </span>
            </div>

            {/* Rows */}
            {SPECS.map((s, i) => (
              <div
                key={s.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr",
                  gap: 16,
                  padding: "14px 0",
                  borderBottom: `1px solid ${color.border}`,
                  opacity: inView ? 1 : 0,
                  animation: inView ? `reveal .4s ${0.05 + i * 0.07}s ease both` : "none",
                }}
              >
                <span style={{
                  fontFamily: font.mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: ".1em",
                  color: color.textFaint,
                  textTransform: "uppercase",
                  paddingTop: 2,
                }}>
                  {s.label}
                </span>
                <span style={{
                  fontFamily: font.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: color.ink900,
                  lineHeight: 1.45,
                }}>
                  {s.value}
                </span>
              </div>
            ))}

            {/* Footer */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#22C55E", flexShrink: 0,
                boxShadow: "0 0 0 3px rgba(34,197,94,.18)",
              }} />
              <span style={{
                fontFamily: font.mono,
                fontSize: 10.5,
                letterSpacing: ".06em",
                color: color.textFaint,
              }}>
                EN LÍNEA · RESPONDE EN MINUTOS
              </span>
            </div>
          </div>

          {/* Right — copy */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              animation: inView ? "reveal .6s .12s ease both" : "none",
            }}
          >
            <div style={{
              fontFamily: font.mono,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: ".16em",
              color: color.primary,
              textTransform: "uppercase",
              marginBottom: 24,
            }}>
              — Quiénes somos
            </div>

            <h2 style={{
              fontFamily: font.display,
              fontSize: isMobile ? 28 : 32,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: color.ink900,
              marginBottom: 28,
            }}>
              Un negocio mendocino
              <br />
              que entiende a los
              <br />
              <span style={{ color: color.primary }}>que manejan.</span>
            </h2>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginBottom: 40,
            }}>
              <p style={{
                fontFamily: font.body,
                fontSize: 15.5,
                lineHeight: 1.75,
                color: color.textMuted,
                margin: 0,
              }}>
                Crow Repuestos nació en Mendoza para cubrir una necesidad real:
                conseguir repuestos de calidad sin perder el día entero. Somos
                un emprendimiento local con atención directa y comprometida.
              </p>
              <p style={{
                fontFamily: font.body,
                fontSize: 15.5,
                lineHeight: 1.75,
                color: color.textMuted,
                margin: 0,
              }}>
                No somos una cadena ni un sitio automatizado. Cuando nos escribís,
                te responde una persona que sabe de repuestos y que va a darte
                la mejor opción para tu vehículo específico.
              </p>
            </div>

            {/* Quote */}
            <div style={{
              borderLeft: `3px solid ${color.primary}`,
              paddingLeft: 20,
            }}>
              <p style={{
                fontFamily: font.display,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-.01em",
                color: color.ink900,
                lineHeight: 1.5,
                margin: 0,
              }}>
                "Conseguís el repuesto hoy,{" "}
                <br />
                no la semana que viene."
              </p>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
