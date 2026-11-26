import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";
import { Container } from "@/shared/ui";
import "./hero.css";

const WA_MSG = "Hola Crow Repuestos! Quiero consultar por un repuesto.";

/** Retraso de entrada como variable CSS (ver hero.css). */
const t = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * Hero de la home.
 *
 * Texto a la izquierda y, a la derecha, un único recurso gráfico: la
 * franja de Crow (ver `BrandStroke`). Todo el color sale del azul de marca:
 * la franja y el botón principal. El verde de WhatsApp queda
 * reducido al ícono, que alcanza para reconocerlo.
 */
export function Hero() {
  const contact = useSiteSettings();
  const waLink = useWaLink();

  return (
    <section className="livery relative overflow-hidden bg-ink900 text-white">
      <Container>
        <div className="grid items-center gap-y-12 pb-14 pt-12 md:pb-20 md:pt-16 lg:min-h-[min(800px,calc(100svh-68px))] lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] lg:gap-x-16 lg:pb-24 lg:pt-14">
          <div className="max-w-[560px] lg:max-w-[480px] xl:max-w-[560px]">
            <h1
              className="lv-reveal m-0 font-display text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-white [text-wrap:balance] sm:text-[44px] xl:text-[54px]"
              style={t(60)}
            >
              Repuestos para seguir en movimiento.
            </h1>

            <p
              className="lv-rise m-0 mt-6 max-w-[42ch] font-body text-[17px] leading-[1.6] text-textOnDark sm:text-[18px] lg:mt-7"
              style={t(220)}
            >
              Lubricantes, baterías, filtros, detailing y repuestos para tu auto, moto o camión.
              Escribinos con marca, modelo y año y te confirmamos si está y cuánto sale.
            </p>

            <div className="lv-rise mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 lg:mt-10" style={t(320)}>
              <a
                href={waLink(WA_MSG)}
                target="_blank"
                rel="noreferrer"
                className="lv-cta inline-flex h-[52px] items-center gap-[10px] rounded-sm bg-primary px-6 font-body text-[16px] font-medium text-white no-underline hover:bg-primaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white max-sm:w-full max-sm:justify-center"
              >
                <WaIcon />
                Consultar por WhatsApp
              </a>
              <Link
                to="/catalogo"
                className="lv-link inline-flex min-h-[44px] items-center font-body text-[16px] font-medium text-white no-underline focus-visible:outline-none max-sm:w-full max-sm:justify-center"
              >
                <span>Explorar el catálogo</span>
              </Link>
            </div>

            <p className="lv-rise m-0 mt-8 font-body text-[14px] leading-[1.6] text-textOnDarkFaint lg:mt-12" style={t(420)}>
              Particulares, talleres y flotas. {contact.hours}
            </p>
          </div>

          {/* Escritorio: columna propia a la derecha, centrada con el texto.
              Celular y tablet: cierra el hero, alineada a la derecha y más chica. */}
          <BrandStroke className="w-[min(70vw,286px)] justify-self-end sm:w-[352px] lg:w-[clamp(352px,34vw,506px)]" />
        </div>
      </Container>
    </section>
  );
}

function WaIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 opacity-90">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/*
 * La franja de Crow.
 *
 * Una sola banda azul, de grosor parejo, que nace casi horizontal abajo a la
 * izquierda y sube hacia arriba a la derecha en una curva amplia, sin
 * cambios de dirección, con las puntas cortadas en diagonal. A su lado corre
 * un filete blanco fino, paralelo, más corto en las dos puntas, y sobre su
 * eje va rotulado el nombre. Color plano, sin degradés ni luces.
 *
 * La banda y el filete se calculan a distancia constante de una misma curva
 * guía: el grosor es parejo y el filete queda paralelo de verdad.
 */
type Pt = [number, number];

// Viewbox 480 x 420. La guía no toca los bordes: queda aire alrededor.
// Asimétrica a propósito: nace casi plana, dobla amplio y sale hacia arriba
// con una leve inclinación. Un arco parejo se leería como un indicador
// circular; una curva cerrada, como un palo de hockey.
const GUIDE: [Pt, Pt, Pt, Pt] = [
  [16, 380],
  [250, 380],
  [420, 300],
  [458, 40],
];
const BAND_WIDTH = 28;
// Puntas cortadas en diagonal: el borde de arriba arranca y termina un poco
// más adelante que el de abajo, así los cortes quedan paralelos entre sí.
const CUT = 0.03;
const FILET_OFFSET = 26; // del eje de la banda al eje del filete, hacia arriba
const FILET_FROM = 0.3; // el filete arranca y termina más adentro que la banda
const FILET_TO = 0.93;

const GX = GUIDE.map((q) => q[0]);
const GY = GUIDE.map((q) => q[1]);
const cubic = (p: number[], s: number) =>
  (1 - s) ** 3 * p[0] + 3 * (1 - s) ** 2 * s * p[1] + 3 * (1 - s) * s ** 2 * p[2] + s ** 3 * p[3];
const dCubic = (p: number[], s: number) =>
  3 * (1 - s) ** 2 * (p[1] - p[0]) + 6 * (1 - s) * s * (p[2] - p[1]) + 3 * s ** 2 * (p[3] - p[2]);

/** Punto a distancia `d` de la guía (positivo = por encima de la curva). */
function offsetPoint(s: number, d: number): Pt {
  const dx = dCubic(GX, s);
  const dy = dCubic(GY, s);
  const len = Math.hypot(dx, dy) || 1;
  return [cubic(GX, s) + (dy / len) * d, cubic(GY, s) - (dx / len) * d];
}

/** Puntos de la paralela a distancia `d`, entre los parámetros `from` y `to`. */
function parallelPoints(d: number, from: number, to: number, steps = 64) {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = offsetPoint(from + ((to - from) * i) / steps, d);
    pts.push(`${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
  }
  return pts;
}

const half = BAND_WIDTH / 2;
const BAND_OUTLINE = `M${[
  ...parallelPoints(half, CUT, 1),
  ...parallelPoints(-half, 0, 1 - CUT).reverse(),
].join("L")}Z`;
const GUIDE_PATH = `M${GUIDE[0].join(" ")} C${GUIDE.slice(1)
  .map((q) => q.join(" "))
  .join(" ")}`;
const FILET_PATH = `M${parallelPoints(FILET_OFFSET, FILET_FROM, FILET_TO).join("L")}`;

/*
 * Marcas de velocidad: tres cortes detrás de la punta de abajo, con el mismo
 * ángulo que el corte de la banda. Cada una más angosta y más tenue que la
 * anterior, como una estela. Es el único agregado y no suma otra curva.
 */
const START_BOTTOM = offsetPoint(0, -half);
const START_TOP = offsetPoint(CUT, half);
const SPEED_MARKS = [
  { gap: 9, width: 7, opacity: 0.7 },
  { gap: 8, width: 5, opacity: 0.45 },
  { gap: 7, width: 3, opacity: 0.25 },
].reduce<{ points: string; opacity: number }[]>((acc, m, i, all) => {
  // Distancia desde el corte de la banda hasta el borde derecho de esta marca.
  const back = all.slice(0, i).reduce((sum, p) => sum + p.gap + p.width, 0) + m.gap;
  const quad: Pt[] = [
    [START_BOTTOM[0] - back - m.width, START_BOTTOM[1]],
    [START_BOTTOM[0] - back, START_BOTTOM[1]],
    [START_TOP[0] - back, START_TOP[1]],
    [START_TOP[0] - back - m.width, START_TOP[1]],
  ];
  acc.push({ points: quad.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" "), opacity: m.opacity });
  return acc;
}, []);

function BrandStroke({ className = "" }: { className?: string }) {
  return (
    // El viewBox arranca en -48 para dejar lugar a las marcas de velocidad
    // a la izquierda de la punta.
    <svg viewBox="-48 0 528 420" className={`block h-auto ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <path id="bs-guide" d={GUIDE_PATH} />
        {/* La banda es un contorno relleno (por los cortes en diagonal), así
            que se "traza" con una máscara: un trazo grueso sobre la guía que
            se dibuja de la punta de abajo hacia arriba. */}
        <mask id="bs-reveal" maskUnits="userSpaceOnUse" x="-40" y="-40" width="560" height="500">
          <path
            d={GUIDE_PATH}
            pathLength={1}
            className="bs-mask"
            stroke="#fff"
            strokeWidth={BAND_WIDTH + 40}
            style={t(200)}
          />
        </mask>
      </defs>
      {SPEED_MARKS.map((m, i) => (
        <polygon
          key={m.points}
          points={m.points}
          fill="#0057D9"
          fillOpacity={m.opacity}
          className="bs-mark"
          style={t(260 + i * 70)}
        />
      ))}
      <path d={BAND_OUTLINE} fill="#0057D9" mask="url(#bs-reveal)" />
      {/* La firma: el nombre rotulado sobre el eje de la banda, en el tramo
          donde la curva todavía es abierta y las letras se leen derechas.
          Va centrado entre los dos bordes (12 de cuerpo en una banda de 28).
          Solo se muestra donde la franja es lo bastante grande para que se
          lea; más chica sería una textura ilegible. */}
      <text className="bs-signature" fontSize={12} dominantBaseline="central" style={t(1150)}>
        <textPath href="#bs-guide" startOffset="11%">
          CROW REPUESTOS
        </textPath>
      </text>
      <path d={FILET_PATH} pathLength={1} className="bs-filet" stroke="#FFFFFF" strokeWidth={1.5} style={t(820)} />
    </svg>
  );
}
