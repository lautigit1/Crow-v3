import type * as React from "react";
import { Container, Icon, type IconName } from "@/shared/ui";
import { color, font } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";

const ITEMS: { icon: IconName; title: string; desc: string; accent: string; bg: string }[] = [
  { icon: "truck",       title: "Entrega en Mendoza",      desc: "Despacho el mismo día en pedidos confirmados.",              accent: "#D97706", bg: "#FFFBEB" },
  { icon: "shieldCheck", title: "Garantía incluida",       desc: "Repuestos con garantía de fábrica. Sin letra chica.",        accent: "#059669", bg: "#ECFDF5" },
  { icon: "wrench",      title: "Asesoría técnica",        desc: "Te ayudamos a identificar la pieza exacta para tu vehículo.", accent: "#0057D9", bg: "#EEF4FF" },
  { icon: "message",     title: "Respuesta en < 1 hora",   desc: "Precio y disponibilidad directo por WhatsApp.",              accent: "#7C3AED", bg: "#F5F3FF" },
];

export function TrustBand() {
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: "#fff", borderBottom: `1px solid ${color.border}` }}
    >
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
          {ITEMS.map((it, i) => (
            <div
              key={it.title}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "28px 24px",
                borderLeft: i === 0 ? "none" : `1px solid ${color.border}`,
                opacity: inView ? 1 : 0,
                animation: inView ? `reveal .5s ${i * 0.09}s ease both` : "none",
                position: "relative",
              }}
            >
              {/* Colored top accent */}
              <div style={{ position: "absolute", top: 0, left: i === 0 ? 0 : 1, right: 0, height: 2, background: it.accent, opacity: 0.7 }} />

              <span style={{
                width: 42, height: 42, flex: "none", borderRadius: 10,
                background: it.bg,
                color: it.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={it.icon} size={19} />
              </span>
              <div>
                <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink900, marginBottom: 4 }}>
                  {it.title}
                </div>
                <div style={{ fontFamily: font.body, fontSize: 12.5, lineHeight: 1.5, color: color.textMuted }}>
                  {it.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
