import clsx from "clsx";
import { Container, Icon, Reveal, type IconName } from "@/shared/ui";

// Íconos tomados de `TrustBand` (widget construido y nunca conectado a la
// home — ver openspec/changes/2026-07-07-landing-visual-refresh). Los
// colores son versiones translúcidas de esa misma paleta, pensadas para
// fondo oscuro (ver nota de fondo más abajo) en vez de los pasteles
// sólidos originales de TrustBand, que estaban pensados para fondo blanco.
const ITEMS: { num: string; claim: string; desc: string; icon: IconName; iconBg: string; iconText: string }[] = [
  {
    num: "01",
    claim: "Sin bots.",
    desc: "Un asesor real te responde siempre. Nunca una respuesta automática.",
    icon: "message",
    iconBg: "bg-[rgba(124,58,237,.16)]",
    iconText: "text-[#A78BFA]",
  },
  {
    num: "02",
    claim: "El mismo día.",
    desc: "Entregamos en Mendoza ciudad. Vos elegís el horario.",
    icon: "truck",
    iconBg: "bg-[rgba(217,119,6,.16)]",
    iconText: "text-[#FBBF24]",
  },
  {
    num: "03",
    claim: "En una hora.",
    desc: "Confirmamos precio y stock al instante, lunes a sábado.",
    icon: "clock",
    iconBg: "bg-[rgba(0,87,217,.2)]",
    iconText: "text-[#7FB0FF]",
  },
  {
    num: "04",
    claim: "Con garantía.",
    desc: "Todos los repuestos tienen garantía de fábrica. Sin letra chica.",
    icon: "shieldCheck",
    iconBg: "bg-[rgba(34,197,94,.16)]",
    iconText: "text-[#4ADE80]",
  },
];

// Per-index border pattern, worked out once for the 2-col mobile / 4-col
// desktop grid:
//   i=0 -> right border always (col 1 of both layouts)
//   i=1 -> right border only at md+ (col 2 of the 4-col row; wraps on mobile)
//   i=2 -> right border always + top border only below md (2nd mobile row)
//   i=3 -> top border only below md, no right border ever
const BORDER_CLASSES = [
  "border-r",
  "md:border-r",
  "border-r border-t md:border-t-0",
  "border-t md:border-t-0",
];

// Fondo oscuro (mismo ink900 que Hero/HowItWorks/CtaFinal) a propósito:
// esta sección quedaba blanca, pegada a CategoryGrid (gris clarito) —
// dos secciones casi idénticas en tono, sin separación real. Pasarla a
// oscuro (a) le da un quiebre de ritmo real a la página y (b) hace que
// los badges de color de arriba resalten mucho más que sobre blanco.
export function StatsSection() {
  return (
    <section className="bg-ink900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(700px_400px_at_50%_0%,rgba(0,87,217,.16),transparent_60%)] pointer-events-none" />
      <Container className="relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {ITEMS.map((item, i) => (
            <Reveal
              key={item.claim}
              index={i}
              className={clsx(
                "py-9 px-[22px] md:py-[52px] md:px-9 border-[rgba(255,255,255,.08)] flex flex-col gap-0",
                BORDER_CLASSES[i]
              )}
            >
              <span className={clsx("mb-4 flex h-11 w-11 items-center justify-center rounded-[10px]", item.iconBg, item.iconText)}>
                <Icon name={item.icon} size={19} />
              </span>

              {/* Counter */}
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-[rgba(255,255,255,.25)] mb-2 block">
                {item.num} ——
              </span>

              {/* Claim */}
              <div className="font-display text-[22px] md:text-[26px] font-extrabold text-white leading-[1.1] tracking-[-0.02em] mb-3.5">
                {item.claim}
              </div>

              {/* Desc */}
              <div className="font-body text-[13px] leading-[1.65] text-[rgba(255,255,255,.42)]">{item.desc}</div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
