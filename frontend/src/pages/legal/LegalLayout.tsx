import type * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Container } from "@/shared/ui";
import { color, font, radius } from "@/shared/config/theme";

const PAGES = [
  { to: "/legal/privacidad",    label: "Política de privacidad" },
  { to: "/legal/terminos",      label: "Términos y condiciones" },
  { to: "/legal/cookies",       label: "Política de cookies" },
  { to: "/legal/licencias",     label: "Licencias" },
  { to: "/legal/accesibilidad", label: "Accesibilidad" },
];

export function LegalLayout({ title, updated, children }: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <>
      {/* Hero */}
      <section style={{ background: color.ink900, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(700px 280px at 80% -10%, rgba(0,87,217,.15), transparent 65%)",
        }} />
        <Container style={{ position: "relative", padding: "52px 40px 48px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".16em", color: color.primary, marginBottom: 14 }}>
            CROW REPUESTOS · LEGAL
          </div>
          <h1 style={{ fontFamily: font.display, fontSize: 38, fontWeight: 900, letterSpacing: "-.02em", color: "#fff", margin: "0 0 12px" }}>
            {title}
          </h1>
          <p style={{ fontFamily: font.mono, fontSize: 12, color: "#3A5068", letterSpacing: ".06em" }}>
            Última actualización: {updated}
          </p>
        </Container>
      </section>

      {/* Body */}
      <section style={{ background: color.surface, padding: "56px 0 96px" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 56, alignItems: "start" }}>

            {/* Sidebar nav */}
            <nav style={{ position: "sticky", top: 100 }}>
              <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".16em", color: color.textFaint, textTransform: "uppercase", marginBottom: 14 }}>
                Documentos legales
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {PAGES.map((p) => {
                  const active = pathname === p.to;
                  return (
                    <Link
                      key={p.to}
                      to={p.to}
                      style={{
                        fontFamily: font.body,
                        fontSize: 13.5,
                        fontWeight: active ? 600 : 400,
                        color: active ? color.primary : color.textMuted,
                        background: active ? color.primarySoft : "transparent",
                        borderLeft: `2px solid ${active ? color.primary : "transparent"}`,
                        padding: "8px 12px",
                        borderRadius: `0 ${radius.sm} ${radius.sm} 0`,
                        textDecoration: "none",
                        display: "block",
                        transition: "color .15s, background .15s",
                      }}
                    >
                      {p.label}
                    </Link>
                  );
                })}
              </div>

              {/* Back home */}
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${color.border}` }}>
                <Link to="/" style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, textDecoration: "none", letterSpacing: ".06em" }}>
                  ← Volver al inicio
                </Link>
              </div>
            </nav>

            {/* Content */}
            <article style={{ maxWidth: 720 }}>
              {children}
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}

// ─── Shared prose components ──────────────────────────────────────────────────

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: font.display, fontSize: 20, fontWeight: 800,
      color: color.ink800, margin: "40px 0 12px", letterSpacing: "-.01em",
    }}>
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: font.body, fontSize: 15, lineHeight: 1.8,
      color: color.textMuted, margin: "0 0 16px",
    }}>
      {children}
    </p>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{
      fontFamily: font.body, fontSize: 15, lineHeight: 1.8,
      color: color.textMuted, paddingLeft: 22, margin: "0 0 16px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      {children}
    </ul>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: color.primarySoft,
      border: `1px solid rgba(0,87,217,.15)`,
      borderLeft: `3px solid ${color.primary}`,
      borderRadius: radius.md,
      padding: "14px 18px",
      fontFamily: font.body, fontSize: 14, lineHeight: 1.7,
      color: color.ink700,
      margin: "20px 0",
    }}>
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ borderTop: `1px solid ${color.border}`, margin: "32px 0" }} />;
}
