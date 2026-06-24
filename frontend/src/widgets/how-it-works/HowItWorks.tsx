import { color, font, radius } from "@/shared/config/theme";
import { Container } from "@/shared/ui";
import { useInView } from "@/shared/lib/useInView";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { waLink } from "@/shared/config/contact";

const STEPS = [
  {
    tag: "Vos",
    title: "Nos contás qué pieza necesitás",
    desc: "Marca, modelo, año y la pieza. Si no tenés el número de parte, con eso alcanza.",
    note: "Por WhatsApp o desde el catálogo",
  },
  {
    tag: "Nosotros",
    title: "Confirmamos stock y precio en el momento",
    desc: "Te responde una persona, no un bot. Si hay alternativas más económicas, te las decimos.",
    note: "En menos de una hora",
  },
  {
    tag: "Retiro",
    title: "Lo retirás o te lo llevamos",
    desc: "Local en Mendoza ciudad o envío a domicilio el mismo día. Vos elegís el horario.",
    note: "Lun–Sáb · 8 a 18 hs",
  },
];

export function HowItWorks() {
  const [ref, inView] = useInView();
  const { isMobile } = useBreakpoint();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: color.ink900, padding: isMobile ? "60px 0" : "96px 0", position: "relative", overflow: "hidden" }}
    >
      {/* Subtle radial glow */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(800px 500px at 80% 50%, rgba(0,87,217,.14), transparent 60%)", pointerEvents: "none" }} />
      <Container>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr",
          gap: isMobile ? 40 : 80,
          alignItems: "start",
        }}>

          {/* Left — sticky header */}
          <div style={{
            opacity: inView ? 1 : 0,
            animation: inView ? "reveal .5s ease both" : "none",
            position: "relative",
          }}>
            <span style={{
              fontFamily: font.mono,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".16em",
              color: "#7FB0FF",
              textTransform: "uppercase",
            }}>
              ¿Cómo funciona?
            </span>

            <h2 style={{
              fontFamily: font.display,
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-.03em",
              color: "#fff",
              margin: "16px 0 24px",
            }}>
              Tres pasos.<br />Sin vueltas.
            </h2>

            <p style={{
              fontFamily: font.body,
              fontSize: 15.5,
              lineHeight: 1.7,
              color: "rgba(255,255,255,.45)",
              marginBottom: 40,
            }}>
              Nada de formularios largos ni catálogos que no cargan. Directo al punto.
            </p>

            <a
              href={waLink("Hola Crow! Necesito consultar la disponibilidad de un repuesto.")}
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
                borderRadius: radius.md,
                padding: "11px 20px",
                textDecoration: "none",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#0046b8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = color.primary)}
            >
              Empezar ahora
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>

          {/* Right — steps */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {STEPS.map((step, i) => (
              <div
                key={step.tag}
                style={{
                  display: "flex",
                  gap: 24,
                  paddingBottom: i < STEPS.length - 1 ? 0 : 0,
                  opacity: inView ? 1 : 0,
                  animation: inView ? `reveal .5s ${0.1 + i * 0.12}s ease both` : "none",
                }}
              >
                {/* Left: number + vertical line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: i === 0 ? color.primary : "rgba(255,255,255,.06)",
                    border: `1.5px solid ${i === 0 ? color.primary : "rgba(255,255,255,.12)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: font.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: i === 0 ? "#fff" : "rgba(255,255,255,.3)",
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1,
                      flex: 1,
                      minHeight: 40,
                      background: "rgba(255,255,255,.08)",
                      margin: "6px 0",
                    }} />
                  )}
                </div>

                {/* Right: content */}
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 36 : 0, paddingTop: 6 }}>
                  <div style={{
                    display: "inline-block",
                    fontFamily: font.mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: i === 0 ? "#7FB0FF" : "rgba(255,255,255,.25)",
                    background: i === 0 ? "rgba(0,87,217,.2)" : "rgba(255,255,255,.05)",
                    borderRadius: 4,
                    padding: "2px 8px",
                    marginBottom: 10,
                  }}>
                    {step.tag}
                  </div>

                  <h3 style={{
                    fontFamily: font.display,
                    fontSize: 19,
                    fontWeight: 800,
                    letterSpacing: "-.015em",
                    color: "#fff",
                    marginBottom: 8,
                    lineHeight: 1.25,
                  }}>
                    {step.title}
                  </h3>

                  <p style={{
                    fontFamily: font.body,
                    fontSize: 14.5,
                    lineHeight: 1.65,
                    color: "rgba(255,255,255,.42)",
                    marginBottom: 10,
                  }}>
                    {step.desc}
                  </p>

                  <span style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    color: "rgba(255,255,255,.2)",
                    letterSpacing: ".04em",
                  }}>
                    {step.note}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
