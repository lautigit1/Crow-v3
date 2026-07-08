import { useEffect, useState } from "react";
import { Container, SectionHeading, BrandMark } from "@/shared/ui";
import { brandApi, type Brand } from "@/entities/brand";
import { useInView } from "@/shared/lib/useInView";

// `hovered` used to only toggle static colors/transform -- now native `hover:`.
function BrandPill({ brand }: { brand: Brand }) {
  return (
    <div className="flex-none flex items-center gap-2.5 h-[68px] px-7 bg-transparent border border-transparent rounded-lg cursor-default transition-[background-color,border-color,transform] duration-[180ms] hover:bg-white hover:border-border hover:-translate-y-0.5">
      <BrandMark name={brand.name} logoUrl={brand.logo_url} size={38} />
      <span className="font-display font-extrabold text-[15px] text-ink800 whitespace-nowrap">{brand.name}</span>
    </div>
  );
}

export function BrandStrip() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [ref, inView] = useInView();

  useEffect(() => {
    brandApi.list().then(setBrands).catch(() => setBrands([]));
  }, []);

  // Need at least a few brands to make marquee look good; fallback to static
  const items = brands ?? [];
  // Triple the array so the marquee never shows a gap
  const track = items.length > 0 ? [...items, ...items, ...items] : [];

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="bg-surface py-20 border-t border-b border-border overflow-hidden"
      style={{ opacity: inView ? 1 : 0, animation: inView ? "reveal .6s ease both" : "none" }}
    >
      <Container>
        <SectionHeading
          eyebrow="MARCAS DESTACADAS"
          title="Respaldados por los fabricantes que el sector reconoce"
          subtitle="Cada referencia que distribuimos está respaldada por garantía de planta."
        />
      </Container>

      {/* Marquee track — full-bleed, no Container constraint */}
      {items.length > 0 && (
        <div className="mt-11 relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute inset-[0_auto_0_0] w-[120px] bg-[linear-gradient(to_right,#F8FAFC,transparent)] z-[1] pointer-events-none" />
          <div className="absolute inset-[0_0_0_auto] w-[120px] bg-[linear-gradient(to_left,#F8FAFC,transparent)] z-[1] pointer-events-none" />

          <div className="flex w-max animate-[marquee_32s_linear_infinite] gap-1 hover:[animation-play-state:paused]">
            {track.map((b, i) => (
              <BrandPill key={`${b.id}-${i}`} brand={b} />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: static grid when brands haven't loaded yet */}
      {items.length === 0 && brands !== null && (
        <Container>
          <p className="text-center text-textMuted mt-8 font-body">No hay marcas configuradas aún.</p>
        </Container>
      )}
    </section>
  );
}
