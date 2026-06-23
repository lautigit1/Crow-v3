import type * as React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading, Icon } from "@/shared/ui";
import { CATEGORIES } from "@/shared/config/categories";
import { color, font, radius } from "@/shared/config/theme";
import { useInView } from "@/shared/lib/useInView";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { waLink } from "@/shared/config/contact";

function WaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.119 1.532 5.845L.057 23.428a.5.5 0 0 0 .609.61l5.652-1.48A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 0 1-5.003-1.373l-.36-.213-3.716.972.992-3.629-.235-.374A9.793 9.793 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
    </svg>
  );
}

function CategoryCard({ c, i, inView }: {
  c: (typeof CATEGORIES)[number];
  i: number;
  inView: boolean;
}) {
  const [hov, setHov] = useState(false);
  const [waHov, setWaHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        background: hov ? color.ink900 : "#fff",
        border: `1.5px solid ${hov ? color.ink900 : color.border}`,
        borderRadius: radius.lg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
        transition: "background .22s, border-color .22s, transform .2s, box-shadow .2s",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov
          ? "0 16px 40px rgba(7,17,31,.18), 0 2px 8px rgba(7,17,31,.1)"
          : "0 1px 3px rgba(13,23,40,.05)",
        opacity: inView ? 1 : 0,
        animation: inView ? `revealScale .44s ${0.05 * i}s ease both` : "none",
      }}
    >
      {/* Blue top accent — always visible, gets brighter on hover */}
      <div style={{
        height: 2,
        background: color.primary,
        opacity: hov ? 1 : 0.3,
        transition: "opacity .22s",
      }} />

      {/* Card body */}
      <div style={{ padding: "22px 22px 18px", flex: 1 }}>
        {/* Index + Icon row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10,
            background: hov ? "rgba(255,255,255,.07)" : color.primarySoft,
            border: `1.5px solid ${hov ? "rgba(255,255,255,.12)" : "rgba(0,87,217,.12)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: hov ? "#7FB0FF" : color.primary,
            transition: "background .22s, border-color .22s, color .22s",
          }}>
            <Icon name={c.icon} size={20} strokeWidth={1.6} />
          </div>
          <span style={{
            fontFamily: font.mono,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".06em",
            color: hov ? "rgba(255,255,255,.2)" : color.textFaint,
            transition: "color .22s",
            paddingTop: 2,
          }}>
            {String(i + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Text */}
        <h3 style={{
          fontFamily: font.display, fontSize: 16, fontWeight: 800,
          letterSpacing: "-.015em",
          color: hov ? "#fff" : color.ink900,
          marginBottom: 6,
          transition: "color .22s",
        }}>
          {c.label}
        </h3>
        <p style={{
          fontFamily: font.body, fontSize: 12.5, lineHeight: 1.6,
          color: hov ? "rgba(255,255,255,.45)" : color.textMuted,
          margin: 0,
          transition: "color .22s",
        }}>
          {c.desc}
        </p>
      </div>

      {/* Action bar */}
      <div style={{
        display: "flex", alignItems: "stretch",
        borderTop: `1px solid ${hov ? "rgba(255,255,255,.08)" : color.border}`,
        transition: "border-color .22s",
      }}>
        {/* Ver catálogo */}
        <Link
          to={`/catalogo?cat=${encodeURIComponent(c.label)}`}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", gap: 5,
            padding: "11px 16px",
            fontFamily: font.body, fontSize: 12.5, fontWeight: 600,
            color: hov ? "rgba(255,255,255,.55)" : color.textMuted,
            textDecoration: "none",
            transition: "color .18s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = hov ? "#fff" : color.primary)}
          onMouseLeave={e => (e.currentTarget.style.color = hov ? "rgba(255,255,255,.55)" : color.textMuted)}
        >
          Ver catálogo
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>

        {/* Divider */}
        <div style={{ width: 1, background: hov ? "rgba(255,255,255,.08)" : color.border, flexShrink: 0, transition: "background .22s" }} />

        {/* Consultar WA */}
        <a
          href={waLink(c.waMsg)}
          target="_blank"
          rel="noreferrer"
          onMouseEnter={() => setWaHov(true)}
          onMouseLeave={() => setWaHov(false)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "11px 16px",
            fontFamily: font.body, fontSize: 12.5, fontWeight: 600,
            color: waHov ? "#fff" : (hov ? "#4ADE80" : "#16A34A"),
            background: waHov ? "#16A34A" : "transparent",
            textDecoration: "none",
            transition: "color .16s, background .16s",
            whiteSpace: "nowrap",
            borderRadius: `0 0 ${radius.lg} 0`,
          }}
        >
          <WaIcon size={13} />
          Consultar
        </a>
      </div>
    </div>
  );
}

export function CategoryGrid() {
  const [ref, inView] = useInView();
  const { isMobile, isTablet } = useBreakpoint();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: color.surface, padding: isMobile ? "60px 0" : "88px 0" }}
    >
      <Container>
        <SectionHeading
          eyebrow="CATÁLOGO POR CATEGORÍA"
          title="Encontrá exactamente lo que tu vehículo necesita"
          subtitle="Explorá el catálogo o consultá por WhatsApp — te respondemos en menos de una hora."
        />
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 14,
          marginTop: isMobile ? 28 : 44,
        }}>
          {CATEGORIES.map((c, i) => (
            <CategoryCard key={c.label} c={c} i={i} inView={inView} />
          ))}
        </div>
      </Container>
    </section>
  );
}
