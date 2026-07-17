import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Container, Icon, Reveal } from "@/shared/ui";
import { CATEGORIES } from "@/shared/config";

const PRIMARY   = CATEGORIES.slice(0, 3); // Autos, Camiones, Motos
const SECONDARY = CATEGORIES.slice(3);    // Lubricantes, Baterías, Filtros, Detailing, Accesorios

const MotionLink = motion(Link);
const LIFT_SPRING = { type: "spring", stiffness: 380, damping: 28 } as const;

// El link subrayado + flecha reutiliza la misma micro-interacción del
// "Ver catálogo" del Hero — mismo gesto en dos lugares distintos del
// sitio, en vez de inventar una tercera variante.
function CatalogLink() {
  return (
    <span className="mt-6 inline-flex items-center gap-1.5 font-body text-[12.5px] font-semibold text-textFaint transition-colors duration-200 group-hover:text-primary">
      <span className="relative">
        Ver catálogo
        <motion.span
          variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-0 -bottom-0.5 h-px w-full origin-left bg-primary"
        />
      </span>
      <motion.svg
        variants={{ rest: { x: 0 }, hover: { x: 3 } }}
        transition={{ duration: 0.15 }}
        width={11}
        height={11}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </motion.svg>
    </span>
  );
}

function PrimaryCard({ c, idx }: { c: (typeof CATEGORIES)[number]; idx: number }) {
  return (
    <Reveal index={idx} className="h-full">
      <MotionLink
        to={`/catalogo?cat=${encodeURIComponent(c.label)}`}
        variants={{ rest: { y: 0 }, hover: { y: -4 } }}
        initial="rest"
        whileHover="hover"
        animate="rest"
        transition={LIFT_SPRING}
        className="group relative flex h-full flex-col justify-between rounded-xl border-[1.5px] border-border bg-white pt-6 px-[26px] pb-[22px] no-underline shadow-[0_1px_3px_rgba(13,23,40,.05)] transition-[border-color,box-shadow] duration-200 hover:border-primary hover:shadow-[0_16px_36px_rgba(0,87,217,.14)]"
      >
        <span className="absolute right-5 top-6 font-mono text-[10px] font-bold tracking-[0.14em] text-textFaint">
          {String(idx + 1).padStart(2, "0")}
        </span>

        <div>
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#EEF4FF] text-primary">
            <Icon name={c.icon} size={20} />
          </span>

          <h3 className="mb-2.5 font-display text-[20px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink900 transition-colors duration-200 group-hover:text-primary">
            {c.label}
          </h3>
          <p className="max-w-[85%] font-body text-[13.5px] leading-[1.55] text-textMuted">
            {c.desc}
          </p>
        </div>

        <CatalogLink />
      </MotionLink>
    </Reveal>
  );
}

// Las 5 secundarias pasan de "tarjetas chicas" (versión achicada de la
// misma card) a chips horizontales — un lenguaje visual distinto a
// propósito, para que la jerarquía primaria/secundaria se lea a simple
// vista en vez de solo notarse por el tamaño de fuente.
function SecondaryChip({ c, idx }: { c: (typeof CATEGORIES)[number]; idx: number }) {
  return (
    <Reveal index={PRIMARY.length + idx}>
      <MotionLink
        to={`/catalogo?cat=${encodeURIComponent(c.label)}`}
        variants={{
          rest: { backgroundColor: "#FFFFFF", color: "#07111F", borderColor: "#E2E8F0" },
          hover: { backgroundColor: "#0057D9", color: "#FFFFFF", borderColor: "#0057D9" },
        }}
        initial="rest"
        whileHover="hover"
        animate="rest"
        transition={{ duration: 0.18 }}
        className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] py-2.5 pl-3.5 pr-[18px] no-underline"
      >
        <Icon name={c.icon} size={15} />
        <span className="font-display text-[13.5px] font-bold whitespace-nowrap">{c.label}</span>
        <motion.svg
          variants={{ rest: { x: 0 }, hover: { x: 3 } }}
          transition={{ duration: 0.15 }}
          width={10}
          height={10}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </motion.svg>
      </MotionLink>
    </Reveal>
  );
}

export function CategoryGrid() {
  return (
    <section className="border-t border-b border-border bg-surface py-16 md:py-24">
      <Container>
        {/* Heading */}
        <div className="mb-8 md:mb-12">
          <div className="mb-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-primary">
            — Catálogo
          </div>
          <h2 className="m-0 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink900 md:text-[32px]">
            Todo lo que tu vehículo necesita.
          </h2>
        </div>

        {/* Primary — Autos, Camiones, Motos */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
          {PRIMARY.map((c, i) => (
            <PrimaryCard key={c.label} c={c} idx={i} />
          ))}
        </div>

        {/* Secondary — chips */}
        <div className="flex flex-wrap gap-2.5">
          {SECONDARY.map((c, i) => (
            <SecondaryChip key={c.label} c={c} idx={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
