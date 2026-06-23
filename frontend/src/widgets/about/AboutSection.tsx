import { color, font, radius } from "@/shared/config/theme";
import { Container, Icon } from "@/shared/ui";
import { useInView } from "@/shared/lib/useInView";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const PILLARS = [
  { icon: "mapPin" as const, text: "Mendoza ciudad — locales y envíos" },
  { icon: "wrench" as const, text: "Autos, motos y camiones" },
  { icon: "shieldCheck" as const, text: "Repuestos con garantía de fábrica" },
  { icon: "phone" as const, text: "Atención directa, sin intermediarios" },
];

export function AboutSection() {
  const [ref, inView] = useInView();
  const { isMobile } = useBreakpoint();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: "#EEF4FF", padding: isMobile ? "60px 0" : "96px 0" }}
    >
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 40 : 80,
            alignItems: "center",
          }}
        >
          {/* Left: visual */}
          <div
            style={{
              position: "relative",
              opacity: inView ? 1 : 0,
              animation: inView ? "reveal .6s ease both" : "none",
            }}
          >
            {/* Main card */}
            <div
              style={{
                background: color.ink900,
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
                minHeight: 340,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: 32,
              }}
            >
              {/* Gradient overlay */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage:
                  "radial-gradient(500px 400px at 70% -10%, rgba(0,87,217,.3), transparent 60%), " +
                  "linear-gradient(180deg, transparent 30%, rgba(7,17,31,.95))",
              }} />

              {/* Logo watermark */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -55%)",
                width: 160, height: 160, opacity: 0.07,
              }}>
                <img src="/crow-logo.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(10)" }} />
              </div>

              {/* Top accent line */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color.primary}, rgba(0,87,217,0) 80%)` }} />

              {/* Bottom text */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: ".14em",
                    color: color.primary,
                    marginBottom: 10,
                  }}
                >
                  MENDOZA · ARGENTINA
                </div>
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.2,
                    marginBottom: 6,
                  }}
                >
                  Crow Repuestos
                </div>
                <div
                  style={{
                    fontFamily: font.body,
                    fontSize: 14,
                    color: color.textOnDark,
                  }}
                >
                  Repuestos y lubricantes para tu vehículo
                </div>
              </div>
            </div>

            {/* Pillars — stacked outside card on the right */}
            <div
              style={{
                position: isMobile ? "relative" : "absolute",
                right: isMobile ? "auto" : -24,
                top: isMobile ? "auto" : "50%",
                transform: isMobile ? "none" : "translateY(-50%)",
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                flexWrap: isMobile ? "wrap" : "nowrap",
                gap: 10,
                marginTop: isMobile ? 16 : 0,
              }}
            >
              {PILLARS.map((p, i) => (
                <div
                  key={p.text}
                  style={{
                    background: "#fff",
                    border: `1px solid ${color.border}`,
                    borderRadius: radius.md,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 4px 16px rgba(0,0,0,.07)",
                    whiteSpace: "nowrap",
                    opacity: inView ? 1 : 0,
                    animation: inView ? `reveal .5s ${0.1 + i * 0.1}s ease both` : "none",
                  }}
                >
                  <span style={{ color: color.primary, flex: "none" }}>
                    <Icon name={p.icon} size={16} strokeWidth={1.8} />
                  </span>
                  <span
                    style={{
                      fontFamily: font.body,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: color.ink900,
                    }}
                  >
                    {p.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: copy */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              animation: inView ? "reveal .6s .15s ease both" : "none",
              paddingRight: 8,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: color.primarySoft,
                borderRadius: 999,
                padding: "5px 14px 5px 10px",
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: color.primary,
                }}
              />
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  color: color.primary,
                }}
              >
                QUIÉNES SOMOS
              </span>
            </div>

            <h2
              style={{
                fontFamily: font.display,
                fontSize: 38,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-.02em",
                color: color.ink900,
                marginBottom: 20,
              }}
            >
              Un negocio mendocino
              <br />
              que entiende a los
              <br />
              <span style={{ color: color.primary }}>que manejan.</span>
            </h2>

            <p
              style={{
                fontFamily: font.body,
                fontSize: 16,
                lineHeight: 1.7,
                color: color.textMuted,
                marginBottom: 20,
              }}
            >
              Crow Repuestos nació en Mendoza para cubrir una necesidad real: conseguir
              repuestos de calidad sin perder el día entero. Somos un emprendimiento local
              con atención directa y comprometida.
            </p>

            <p
              style={{
                fontFamily: font.body,
                fontSize: 16,
                lineHeight: 1.7,
                color: color.textMuted,
                marginBottom: 36,
              }}
            >
              No somos una cadena ni un sitio automatizado. Cuando nos escribís,
              te responde una persona que sabe de repuestos y que va a darte
              la mejor opción para tu vehículo específico.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#22C55E", flexShrink: 0,
                boxShadow: "0 0 0 3px rgba(34,197,94,.2)",
              }} />
              <span style={{ fontFamily: font.body, fontSize: 13.5, color: color.textMuted }}>
                Atención de lunes a sábado, 8 a 18 hs.
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
