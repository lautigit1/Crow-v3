import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";
import { Container } from "@/shared/ui";
import "./hero.css";

const WA_MSG = "Hola Crow Repuestos! Quiero consultar por un repuesto.";

/** Retraso de entrada como variable CSS (ver hero.css). */
const t = (ms: number, dur?: number) =>
  ({ "--d": `${ms}ms`, ...(dur ? { "--dur": `${dur}ms` } : {}) }) as CSSProperties;

/**
 * Hero de la home.
 *
 * Texto a la izquierda, con aire, y un único recurso gráfico: tres franjas
 * de livery (la decoración lateral de un auto de competición) en los colores
 * de marca, que bajan desde arriba y doblan hacia la derecha como una curva
 * de ruta. Sobre la franja ancha va rotulado el nombre, como en un auto.
 *
 * El azul de las franjas es el gran acento de color; el verde queda solo
 * para el botón de WhatsApp, que es la acción principal del comercio.
 */
export function Hero() {
  const contact = useSiteSettings();
  const waLink = useWaLink();

  return (
    <section className="livery relative overflow-hidden bg-ink900 text-white">
      {/* Escritorio: las franjas ocupan la mitad derecha, ancladas abajo. */}
      <Stripes className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[55%] lg:block xl:w-[60%]" />

      <Container>
        <div className="relative flex flex-col justify-center pb-0 pt-14 md:pt-20 lg:min-h-[min(760px,calc(100svh-68px))] lg:pb-20 lg:pt-16">
          <div className="max-w-[560px] lg:max-w-[470px] xl:max-w-[560px]">
            <h1
              className="lv-reveal m-0 font-display text-[34px] font-medium leading-[1.06] tracking-[-0.03em] text-white sm:text-[42px] xl:text-[50px]"
              style={t(80)}
            >
              Repuestos para seguir en movimiento.
            </h1>

            <p
              className="lv-rise m-0 mt-6 max-w-[40ch] font-body text-[17px] leading-[1.6] text-textOnDark sm:text-[18px]"
              style={t(260)}
            >
              Lubricantes, baterías, filtros, detailing y repuestos para tu auto, moto o camión.
              Escribinos con marca, modelo y año y te confirmamos si está y cuánto sale.
            </p>

            <div className="lv-rise mt-9 flex flex-wrap items-center gap-x-8 gap-y-4" style={t(380)}>
              <a
                href={waLink(WA_MSG)}
                target="_blank"
                rel="noreferrer"
                className="lv-cta inline-flex h-[52px] items-center rounded-md bg-whatsapp px-6 font-body text-[16px] font-semibold text-[#06371a] no-underline hover:bg-[#1fbb59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
              >
                Consultar por WhatsApp
              </a>
              <Link
                to="/catalogo"
                className="lv-link inline-flex min-h-[44px] items-center pb-[2px] font-body text-[16px] font-medium text-white no-underline focus-visible:outline-none"
              >
                Explorar el catálogo
              </Link>
            </div>

            <p className="lv-rise m-0 mt-10 font-body text-[14px] leading-[1.6] text-textOnDarkFaint" style={t(520)}>
              Particulares, talleres y flotas. {contact.hours}
            </p>
          </div>
        </div>
      </Container>

      {/* Celular y tablet: las franjas cierran el hero, a sangre hasta el borde. */}
      <Stripes compact className="lv-compact pointer-events-none mt-6 block h-[170px] w-full sm:mt-10 sm:h-[230px] lg:hidden" />
    </section>
  );
}

/*
 * Geometría en el viewBox de 900 x 700. Las tres bandas comparten el centro
 * de la curva (520, 260); cada una baja por x = 520 - r y sale hacia la
 * derecha por y = 260 + r. Los tramos rectos se extienden mucho más allá del
 * viewBox para llegar siempre al borde superior y al derecho del hero.
 */
const BANDS = [
  { r: 260, w: 46, color: "#0057D9", d: 0, dur: 1150 },
  { r: 216, w: 5, color: "#FFFFFF", d: 140, dur: 1100 },
  { r: 198, w: 12, color: "#0057D9", d: 220, dur: 1050 },
];

const bandPath = (r: number) => `M${520 - r} -900 V260 A${r} ${r} 0 0 0 520 ${260 + r} H2200`;

// Largo del tramo vertical + la curva de la franja ancha: ahí empieza el
// tramo horizontal, donde va el rótulo.
const RAIL_STRAIGHT_START = 1160 + (Math.PI / 2) * 260;

function Stripes({ className, compact = false }: { className?: string; compact?: boolean }) {
  const railId = compact ? "lv-rail-c" : "lv-rail";
  return (
    <svg
      viewBox="0 0 900 700"
      // Escritorio: la curva entera, anclada abajo a la derecha. Compacto: se
      // llena el ancho (slice) y se ve la curva cruzando de lado a lado.
      preserveAspectRatio={compact ? "xMaxYMax slice" : "xMaxYMax meet"}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={railId} d={bandPath(BANDS[0].r)} />
      </defs>
      {BANDS.map((b) => (
        <path
          key={b.r}
          d={bandPath(b.r)}
          pathLength={1}
          stroke={b.color}
          strokeWidth={b.w}
          className="lv-stripe"
          style={t(b.d, b.dur)}
        />
      ))}
      {/* El nombre rotulado sobre la franja ancha, en el tramo horizontal.
          En celular la franja queda angosta y el rótulo no se leería. */}
      <text
        className={compact ? "lv-lettering max-sm:hidden" : "lv-lettering"}
        fontSize={15}
        dominantBaseline="central"
        style={t(950)}
      >
        <textPath href={`#${railId}`} startOffset={RAIL_STRAIGHT_START + 70}>
          CROW REPUESTOS
        </textPath>
      </text>
    </svg>
  );
}
