import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/shared/ui";
import { color, font, radius } from "@/shared/config/theme";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function IconPin() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

const TRUST = [
  { Icon: IconPin,    label: "Mendoza, Argentina",      sub: "Distribuidora local" },
  { Icon: IconBolt,   label: "Respuesta en < 1 hora",   sub: "Lun–Sáb · 8 a 18 hs" },
  { Icon: IconShield, label: "Garantía de fábrica",     sub: "En todos los productos" },
  { Icon: IconWrench, label: "Asesoría técnica real",   sub: "Con personas, no bots" },
];

export function AuthShell({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { isMobile } = useBreakpoint();
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>

      {/* ── Left: brand panel — hidden on mobile ── */}
      {!isMobile && <div style={{
        background: color.ink900,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "44px 52px",
      }}>
        {/* Deep blue glow top-right */}
        <div style={{
          position: "absolute", top: -180, right: -120,
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,87,217,.28) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Subtle warm glow bottom-left */}
        <div style={{
          position: "absolute", bottom: -200, left: -100,
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,40,140,.16) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Diagonal light streak */}
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
          background: "linear-gradient(135deg, rgba(0,87,217,.04) 0%, transparent 50%, rgba(0,0,0,.15) 100%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ position: "relative" }}>
          <Logo variant="dark" />
        </div>

        {/* Main copy */}
        <div style={{ position: "relative" }}>
          <p style={{
            fontFamily: font.mono, fontSize: 11, letterSpacing: ".2em",
            color: "#3A5A7A", textTransform: "uppercase", marginBottom: 20,
          }}>
            Repuestos automotrices
          </p>

          <h2 style={{
            fontFamily: font.display, fontSize: 42, fontWeight: 900,
            lineHeight: 1.06, letterSpacing: "-.035em",
            color: "#fff", margin: "0 0 24px", maxWidth: 360,
          }}>
            Tu repuesto en Mendoza, hoy.
          </h2>

          <p style={{
            fontFamily: font.body, fontSize: 15, lineHeight: 1.75,
            color: "#4E6B82", maxWidth: 320, margin: "0 0 48px",
          }}>
            Cotizá, hacé seguimiento y recibí asesoría técnica real desde tu cuenta.
          </p>

          {/* Trust list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {TRUST.map(({ Icon, label, sub }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Icon circle */}
                <div style={{
                  width: 40, height: 40, borderRadius: radius.md, flexShrink: 0,
                  border: "1px solid rgba(0,87,217,.35)",
                  background: "rgba(0,87,217,.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#4D8FE8",
                }}>
                  <Icon />
                </div>
                <div>
                  <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: "#C4D4E0" }}>{label}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: "#3A5A7A", letterSpacing: ".04em" }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: font.mono, fontSize: 11, color: "#1E3448", letterSpacing: ".06em" }}>
            © {new Date().getFullYear()} CROW REPUESTOS
          </span>
          <Link to="/" style={{ fontFamily: font.mono, fontSize: 11, color: "#2A4560", textDecoration: "none", letterSpacing: ".06em", transition: "color .15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#6B8FB0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2A4560")}
          >
            ← VOLVER AL SITIO
          </Link>
        </div>
      </div>}

      {/* ── Right: form panel ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        background: "#F8FAFC",
        position: "relative",
      }}>
        {/* Thin top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color.primary}, rgba(0,87,217,0) 60%)`,
          pointerEvents: "none",
        }} />

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          border: `1px solid ${color.border}`,
          boxShadow: "0 4px 24px rgba(13,23,40,.07), 0 1px 4px rgba(13,23,40,.04)",
          padding: "40px 36px",
        }}>
          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontFamily: font.display, fontSize: 26, fontWeight: 900,
              letterSpacing: "-.025em", color: color.ink900, margin: "0 0 8px",
            }}>
              {title}
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 14, color: color.textMuted, lineHeight: 1.6, margin: 0 }}>
              {subtitle}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: color.border, marginBottom: 24 }} />

          {/* Form slot */}
          {children}

          {/* Footer */}
          {footer && (
            <div style={{
              marginTop: 24, paddingTop: 20,
              borderTop: `1px solid ${color.border}`,
              fontFamily: font.body, fontSize: 13.5,
              color: color.textMuted, textAlign: "center",
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
