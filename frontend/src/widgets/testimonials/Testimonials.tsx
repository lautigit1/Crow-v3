import clsx from "clsx";
import { Container, SectionHeading } from "@/shared/ui";
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

// ITEMS is a fixed 3-item literal array, so each card's stagger delay
// (`i * 0.12`) is precomputed as its own static Tailwind class instead of
// an interpolated arbitrary value.
const REVEAL_ANIM = [
  "animate-[revealScale_.55s_0s_ease_both]",
  "animate-[revealScale_.55s_0.12s_ease_both]",
  "animate-[revealScale_.55s_0.24s_ease_both]",
];

export function Testimonials() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-surface py-24 border-t border-border">
      <Container>
        <SectionHeading
          eyebrow="LO QUE DICEN NUESTROS CLIENTES"
          title="Confianza que se construye repuesto a repuesto"
          subtitle="Talleres, distribuidoras y empresas de transporte que eligen Crow cada día."
        />

        <div className="grid grid-cols-3 gap-5 mt-[52px]">
          {ITEMS.map((t, i) => (
            <div
              key={t.name}
              className={clsx(
                "bg-white border border-border rounded-lg pt-8 px-7 pb-7 flex flex-col gap-6 relative overflow-hidden",
                inView ? "opacity-100" : "opacity-0",
                inView && REVEAL_ANIM[i]
              )}
            >
              {/* Decorative quote mark */}
              <div className="absolute top-4 right-6 text-[96px] leading-none text-primarySoft select-none pointer-events-none font-[Georgia,serif]">
                "
              </div>

              {/* Stars */}
              <div className="flex gap-[3px]">
                {[...Array(5)].map((_, si) => (
                  <span key={si} className="text-sm text-[#F59E0B]">
                    ★
                  </span>
                ))}
              </div>

              {/* Quote text */}
              <p className="font-body text-[15px] leading-[1.7] text-ink700 italic flex-1 relative">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-5 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-[linear-gradient(135deg,#0057D9_0%,#0047B3_100%)] flex items-center justify-center font-display font-extrabold text-base text-white flex-none">
                  {t.initial}
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-ink900">
                    {t.name}
                  </div>
                  <div className="font-body text-xs text-textMuted mt-0.5">
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
