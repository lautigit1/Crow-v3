import { Container } from "@/shared/ui";
import { color, font } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const ITEMS = [
  { num: "01",  claim: "Sin bots.",       desc: "Un asesor real te responde siempre. Nunca una respuesta automática." },
  { num: "02",  claim: "El mismo día.",   desc: "Entregamos en Mendoza ciudad. Vos elegís el horario." },
  { num: "03",  claim: "En una hora.",    desc: "Confirmamos precio y stock al instante, lunes a sábado." },
  { num: "04",  claim: "Con garantía.",   desc: "Todos los repuestos tienen garantía de fábrica. Sin letra chica." },
];

export function StatsSection() {
  const [ref, inView] = useInView();
  const { isMobile } = useBreakpoint();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: "#fff",
        borderTop: `1px solid ${color.border}`,
        borderBottom: `1px solid ${color.border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color.primary} 0%, rgba(0,87,217,0) 60%)`,
      }} />

      <Container>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 0,
        }}>
          {ITEMS.map((item, i) => {
            const isLastRow = isMobile && i >= 2;
            const showRightBorder = isMobile ? i % 2 === 0 : i < 3;
            return (
              <div
                key={item.claim}
                style={{
                  padding: isMobile ? "36px 22px" : "52px 36px",
                  borderRight: showRightBorder ? `1px solid ${color.border}` : "none",
                  borderTop: isLastRow ? `1px solid ${color.border}` : "none",
                  opacity: inView ? 1 : 0,
                  animation: inView ? `reveal .5s ${i * 0.09}s ease both` : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                {/* Counter */}
                <span style={{
                  fontFamily: font.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".18em",
                  color: color.primary,
                  marginBottom: 14,
                  display: "block",
                }}>
                  {item.num} ——
                </span>

                {/* Claim */}
                <div style={{
                  fontFamily: font.display,
                  fontSize: isMobile ? 22 : 26,
                  fontWeight: 800,
                  color: color.ink900,
                  lineHeight: 1.1,
                  letterSpacing: "-.02em",
                  marginBottom: 14,
                }}>
                  {item.claim}
                </div>

                {/* Desc */}
                <div style={{
                  fontFamily: font.body,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: color.textMuted,
                }}>
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
