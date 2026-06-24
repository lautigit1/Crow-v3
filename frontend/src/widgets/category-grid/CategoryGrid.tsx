import type * as React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "@/shared/ui";
import { CATEGORIES } from "@/shared/config/categories";
import { color, font, radius } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const PRIMARY   = CATEGORIES.slice(0, 3); // Autos, Camiones, Motos
const SECONDARY = CATEGORIES.slice(3);    // Lubricantes, Baterías, Filtros, Detailing, Accesorios

function Card({
  c,
  idx,
  inView,
  size,
}: {
  c: (typeof CATEGORIES)[number];
  idx: number;
  inView: boolean;
  size: "primary" | "secondary";
}) {
  const [hov, setHov] = useState(false);

  return (
    <Link
      to={`/catalogo?cat=${encodeURIComponent(c.label)}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fff",
        border: `1.5px solid ${hov ? color.primary : color.border}`,
        borderRadius: radius.lg,
        padding: size === "primary" ? "28px 26px 22px" : "20px 20px 16px",
        textDecoration: "none",
        transition: "border-color .18s, box-shadow .18s, transform .18s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 24px rgba(0,87,217,.1)` : "0 1px 3px rgba(13,23,40,.05)",
        opacity: inView ? 1 : 0,
        animation: inView ? `reveal .4s ${0.05 * idx}s ease both` : "none",
        cursor: "pointer",
      }}
    >
      {/* Name */}
      <div>
        <h3 style={{
          fontFamily: font.display,
          fontSize: size === "primary" ? 20 : 14,
          fontWeight: 800,
          letterSpacing: "-.02em",
          color: hov ? color.primary : color.ink900,
          marginBottom: size === "primary" ? 10 : 6,
          transition: "color .18s",
          lineHeight: 1.2,
        }}>
          {c.label}
        </h3>

        <p style={{
          fontFamily: font.body,
          fontSize: size === "primary" ? 13.5 : 11.5,
          lineHeight: 1.55,
          color: color.textMuted,
          margin: 0,
        }}>
          {c.desc}
        </p>
      </div>

      {/* Arrow */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: size === "primary" ? 24 : 14,
        fontFamily: font.body,
        fontSize: 12,
        fontWeight: 600,
        color: hov ? color.primary : color.textFaint,
        transition: "color .18s",
      }}>
        Ver catálogo
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </Link>
  );
}

export function CategoryGrid() {
  const [ref, inView] = useInView();
  const { isMobile } = useBreakpoint();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: color.surface,
        padding: isMobile ? "64px 0" : "96px 0",
        borderTop: `1px solid ${color.border}`,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      <Container>
        {/* Heading */}
        <div style={{ marginBottom: isMobile ? 32 : 48 }}>
          <div style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: ".16em",
            color: color.primary,
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            — Catálogo
          </div>
          <h2 style={{
            fontFamily: font.display,
            fontSize: isMobile ? 26 : 32,
            fontWeight: 800,
            letterSpacing: "-.03em",
            lineHeight: 1.1,
            color: color.ink900,
            margin: 0,
          }}>
            Todo lo que tu vehículo necesita.
          </h2>
        </div>

        {/* Primary row — Autos, Camiones, Motos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: isMobile ? 8 : 10,
          marginBottom: isMobile ? 8 : 10,
        }}>
          {PRIMARY.map((c, i) => (
            <Card key={c.label} c={c} idx={i} inView={inView} size="primary" />
          ))}
        </div>

        {/* Secondary row — Lubricantes, Baterías, Filtros, Detailing, Accesorios */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
          gap: isMobile ? 8 : 10,
        }}>
          {SECONDARY.map((c, i) => (
            <Card key={c.label} c={c} idx={PRIMARY.length + i} inView={inView} size="secondary" />
          ))}
        </div>
      </Container>
    </section>
  );
}
