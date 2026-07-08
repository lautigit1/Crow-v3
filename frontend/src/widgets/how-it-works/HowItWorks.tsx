import clsx from "clsx";
import { Container } from "@/shared/ui";
import { useInView } from "@/shared/lib/useInView";
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
    desc: "Te contamos qué tenemos disponible para tu vehículo, y si hay una alternativa más económica, también.",
    note: "Con foto o N° de parte, si lo tenés",
  },
  {
    tag: "Retiro",
    title: "Lo retirás o te lo llevamos",
    desc: "Local en Mendoza ciudad o envío a domicilio. Vos elegís el horario.",
    note: "Lun–Sáb · 8 a 18 hs",
  },
];
// Nota: "sin bots" / "menos de una hora" / "el mismo día" se sacaron de
// acá a propósito — StatsSection (el bloque anterior en la home) ya los
// dice. Este widget se enfoca en el proceso (qué hace cada uno en cada
// paso), no en repetir las promesas.

export function HowItWorks() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-ink900 py-[60px] md:py-24 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_80%_50%,rgba(0,87,217,.14),transparent_60%)] pointer-events-none" />
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-20 items-start">

          {/* Left — sticky header */}
          <div className="relative" style={{ opacity: inView ? 1 : 0, animation: inView ? "reveal .5s ease both" : "none" }}>
            <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-[#7FB0FF] uppercase">
              ¿Cómo funciona?
            </span>

            <h2 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white mt-4 mb-6 mx-0">
              Tres pasos.<br />Sin vueltas.
            </h2>

            <p className="font-body text-[15.5px] leading-[1.7] text-[rgba(255,255,255,.45)] mb-10">
              Nada de formularios largos ni catálogos que no cargan. Directo al punto.
            </p>

            <a
              href={waLink("Hola Crow! Necesito consultar la disponibilidad de un repuesto.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-white font-body text-[14px] font-semibold rounded-md py-[11px] px-5 no-underline transition-colors duration-150 hover:bg-[#0046b8]"
            >
              Empezar ahora
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>

          {/* Right — steps */}
          <div className="flex flex-col">
            {STEPS.map((step, i) => {
              const first = i === 0;
              const last = i === STEPS.length - 1;
              return (
                <div
                  key={step.tag}
                  className="flex gap-6"
                  style={{ opacity: inView ? 1 : 0, animation: inView ? `reveal .5s ${0.1 + i * 0.12}s ease both` : "none" }}
                >
                  {/* Left: number + vertical line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-[1.5px]",
                        first ? "bg-primary border-primary" : "bg-[rgba(255,255,255,.06)] border-[rgba(255,255,255,.12)]"
                      )}
                    >
                      <span className={clsx("font-mono text-[12px] font-bold", first ? "text-white" : "text-[rgba(255,255,255,.3)]")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    {!last && <div className="w-px flex-1 min-h-10 bg-[rgba(255,255,255,.08)] my-1.5" />}
                  </div>

                  {/* Right: content */}
                  <div className={clsx("pt-1.5", last ? "pb-0" : "pb-9")}>
                    <div
                      className={clsx(
                        "inline-block font-mono text-[10.5px] font-bold tracking-[0.1em] uppercase rounded-[4px] py-0.5 px-2 mb-2.5",
                        first ? "text-[#7FB0FF] bg-[rgba(0,87,217,.2)]" : "text-[rgba(255,255,255,.25)] bg-[rgba(255,255,255,.05)]"
                      )}
                    >
                      {step.tag}
                    </div>

                    <h3 className="font-display text-[19px] font-extrabold tracking-[-0.015em] text-white mb-2 leading-[1.25]">
                      {step.title}
                    </h3>

                    <p className="font-body text-[14.5px] leading-[1.65] text-[rgba(255,255,255,.42)] mb-2.5">
                      {step.desc}
                    </p>

                    <span className="font-mono text-[11px] text-[rgba(255,255,255,.2)] tracking-[0.04em]">
                      {step.note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
