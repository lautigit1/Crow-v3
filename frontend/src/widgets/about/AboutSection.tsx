import { Container } from "@/shared/ui";
import { useInView } from "@/shared/lib/useInView";

// Horario / Entrega / Garantía se sacaron a propósito — ya aparecen en
// StatsSection, HowItWorks y CtaFinal. Esta ficha se queda solo con los
// datos que no están en ningún otro lado de la home.
const SPECS = [
  { label: "Rubro",     value: "Repuestos · Lubricantes · Detailing" },
  { label: "Ciudad",    value: "Mendoza capital, Argentina" },
  { label: "Vehículos", value: "Autos · Motos · Camiones" },
];

export function AboutSection() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-white border-t border-border py-16 md:py-[104px]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-start">

          {/* Left — ficha técnica */}
          <div style={{ opacity: inView ? 1 : 0, animation: inView ? "reveal .6s ease both" : "none" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-1 pb-4 border-b-2 border-ink900">
              <span className="font-display text-[11px] font-extrabold tracking-[0.18em] text-ink900 uppercase">
                Ficha técnica
              </span>
              <span className="font-mono text-[10px] text-textFaint tracking-[0.08em]">CRW-001</span>
            </div>

            {/* Rows */}
            {SPECS.map((s, i) => (
              <div
                key={s.label}
                className="grid grid-cols-[100px_1fr] gap-4 py-3.5 border-b border-border"
                style={{ opacity: inView ? 1 : 0, animation: inView ? `reveal .4s ${0.05 + i * 0.07}s ease both` : "none" }}
              >
                <span className="font-mono text-[10px] font-medium tracking-[0.1em] text-textFaint uppercase pt-0.5">
                  {s.label}
                </span>
                <span className="font-body text-[14px] font-semibold text-ink900 leading-[1.45]">{s.value}</span>
              </div>
            ))}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-5">
              <span className="w-[7px] h-[7px] rounded-full bg-[#22C55E] shrink-0 shadow-[0_0_0_3px_rgba(34,197,94,.18)]" />
              <span className="font-mono text-[10.5px] tracking-[0.06em] text-textFaint">
                EN LÍNEA · RESPONDE EN MINUTOS
              </span>
            </div>
          </div>

          {/* Right — copy */}
          <div style={{ opacity: inView ? 1 : 0, animation: inView ? "reveal .6s .12s ease both" : "none" }}>
            <div className="font-mono text-[10.5px] font-medium tracking-[0.16em] text-primary uppercase mb-6">
              — Quiénes somos
            </div>

            <h2 className="font-display text-[28px] md:text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink900 mb-7">
              Un negocio mendocino
              <br />
              que entiende a los
              <br />
              <span className="text-primary">que manejan.</span>
            </h2>

            <div className="flex flex-col gap-4 mb-10">
              <p className="font-body text-[15.5px] leading-[1.75] text-textMuted m-0">
                Crow Repuestos nació en Mendoza para cubrir una necesidad real:
                conseguir repuestos de calidad sin perder el día entero. Somos
                un emprendimiento local con atención directa y comprometida.
              </p>
              <p className="font-body text-[15.5px] leading-[1.75] text-textMuted m-0">
                No somos una cadena ni un sitio automatizado. Cuando nos escribís,
                te responde una persona que sabe de repuestos y que va a darte
                la mejor opción para tu vehículo específico.
              </p>
            </div>

            {/* Quote */}
            <div className="border-l-[3px] border-primary pl-5">
              <p className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink900 leading-[1.5] m-0">
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
