import type * as React from "react";
import clsx from "clsx";
import { Container, Icon, type IconName } from "@/shared/ui";
import { useInView } from "@/shared/lib/useInView";

// Fixed set of 4 items defined right here (not runtime data), so their
// per-item accent/background colors were converted to literal Tailwind
// classes instead of hex fields read into inline style.
const ITEMS: { icon: IconName; title: string; desc: string; iconBg: string; iconText: string; topAccent: string }[] = [
  { icon: "truck",       title: "Entrega en Mendoza",      desc: "Despacho el mismo día en pedidos confirmados.",              iconBg: "bg-[#FFFBEB]", iconText: "text-[#D97706]", topAccent: "bg-[#D97706]" },
  { icon: "shieldCheck", title: "Garantía incluida",       desc: "Repuestos con garantía de fábrica. Sin letra chica.",        iconBg: "bg-[#ECFDF5]", iconText: "text-[#059669]", topAccent: "bg-[#059669]" },
  { icon: "wrench",      title: "Asesoría técnica",        desc: "Te ayudamos a identificar la pieza exacta para tu vehículo.", iconBg: "bg-[#EEF4FF]", iconText: "text-primary",   topAccent: "bg-primary" },
  { icon: "message",     title: "Respuesta en < 1 hora",   desc: "Precio y disponibilidad directo por WhatsApp.",              iconBg: "bg-[#F5F3FF]", iconText: "text-[#7C3AED]", topAccent: "bg-[#7C3AED]" },
];

export function TrustBand() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-white border-b border-border">
      <Container>
        <div className="grid grid-cols-4 gap-0">
          {ITEMS.map((it, i) => (
            <div
              key={it.title}
              className={clsx(
                "flex items-start gap-3.5 py-7 px-6 relative",
                i === 0 ? "border-l-0" : "border-l border-border"
              )}
              style={{
                opacity: inView ? 1 : 0,
                animation: inView ? `reveal .5s ${i * 0.09}s ease both` : "none",
              }}
            >
              {/* Colored top accent */}
              <div
                className={clsx(
                  "absolute top-0 right-0 h-0.5 opacity-70",
                  i === 0 ? "left-0" : "left-px",
                  it.topAccent
                )}
              />

              <span className={clsx("w-[42px] h-[42px] flex-none rounded-[10px] flex items-center justify-center", it.iconBg, it.iconText)}>
                <Icon name={it.icon} size={19} />
              </span>
              <div>
                <div className="font-display text-[14px] font-bold text-ink900 mb-1">{it.title}</div>
                <div className="font-body text-[12.5px] leading-[1.5] text-textMuted">{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
