import { useEffect, useState } from "react";
import { Container, SectionHeading, BrandMark } from "@/shared/ui";
import { brandApi, type Brand } from "@/entities/brand";
import { color, font, radius } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";

function BrandPill({ brand }: { brand: Brand }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 68,
        padding: "0 28px",
        background: hovered ? "#fff" : "rgba(255,255,255,.0)",
        border: `1px solid ${hovered ? color.border : "rgba(0,0,0,.0)"}`,
        borderRadius: radius.lg,
        cursor: "default",
        transition: "background .18s, border-color .18s, transform .18s",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      <BrandMark name={brand.name} logoUrl={brand.logo_url} size={38} />
      <span
        style={{
          fontFamily: font.display,
          fontWeight: 800,
          fontSize: 15,
          color: color.ink800,
          whiteSpace: "nowrap",
        }}
      >
        {brand.name}
      </span>
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
      style={{
        background: color.surface,
        padding: "80px 0",
        borderTop: `1px solid ${color.border}`,
        borderBottom: `1px solid ${color.border}`,
        overflow: "hidden",
        opacity: inView ? 1 : 0,
        animation: inView ? "reveal .6s ease both" : "none",
      }}
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
        <div
          style={{
            marginTop: 44,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Fade edges */}
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: 120,
              background: `linear-gradient(to right, ${color.surface}, transparent)`,
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "0 0 0 auto",
              width: 120,
              background: `linear-gradient(to left, ${color.surface}, transparent)`,
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              width: "max-content",
              animation: "marquee 32s linear infinite",
              gap: 4,
            }}
          >
            {track.map((b, i) => (
              <BrandPill key={`${b.id}-${i}`} brand={b} />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: static grid when brands haven't loaded yet */}
      {items.length === 0 && brands !== null && (
        <Container>
          <p style={{ textAlign: "center", color: color.textMuted, marginTop: 32, fontFamily: font.body }}>
            No hay marcas configuradas aún.
          </p>
        </Container>
      )}
    </section>
  );
}
