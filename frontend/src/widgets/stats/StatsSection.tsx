import { Container } from "@/shared/ui";
import { color, font } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";
import { Icon, type IconName } from "@/shared/ui";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const VALUES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "message",     title: "Atención personalizada", desc: "Un asesor real te responde. Sin bots, sin esperas interminables." },
  { icon: "mapPin",      title: "Mendoza ciudad",         desc: "Entregamos el mismo día dentro de la capital mendocina." },
  { icon: "clock",       title: "Respuesta en < 1 hora",  desc: "Lunes a sábado de 8 a 18 hs. Confirmamos precio y stock al instante." },
  { icon: "shieldCheck", title: "Garantía incluida",      desc: "Todos nuestros repuestos tienen garantía de fábrica. Sin letra chica." },
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
      }}
    >
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          }}
        >
          {VALUES.map((v, i) => {
            const isLastRow = isMobile && i >= 2;
            const showRightBorder = isMobile ? i % 2 === 0 : i < 3;
            return (
              <div
                key={v.title}
                style={{
                  padding: isMobile ? "32px 20px" : "44px 32px",
                  borderRight: showRightBorder ? `1px solid ${color.border}` : "none",
                  borderTop: isLastRow ? `1px solid ${color.border}` : "none",
                  opacity: inView ? 1 : 0,
                  animation: inView ? `reveal .5s ${i * 0.08}s ease both` : "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 18,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: color.primarySoft,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: color.primary,
                    marginTop: 2,
                  }}
                >
                  <Icon name={v.icon} size={20} strokeWidth={1.7} />
                </div>

                {/* Text */}
                <div>
                  <div
                    style={{
                      fontFamily: font.display,
                      fontSize: 15,
                      fontWeight: 700,
                      color: color.ink900,
                      lineHeight: 1.25,
                      marginBottom: 6,
                    }}
                  >
                    {v.title}
                  </div>
                  <div
                    style={{
                      fontFamily: font.body,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: color.textMuted,
                    }}
                  >
                    {v.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
