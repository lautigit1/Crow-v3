import type * as React from "react";
import { Link } from "react-router-dom";
import { Container, Logo } from "@/shared/ui";
import { Hoverable } from "@/shared/lib/Hoverable";
import { contact, waLink } from "@/shared/config/contact";
import { color, font, radius } from "@/shared/config/theme";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

// ─── Tokens ────────────────────────────────────────────────────────────────────
const INK = "#07111F";
const RULE = "rgba(255,255,255,.07)";
const MUTED = "#4E6175";
const LINK_COL = "#7A95AA";

const linkStyle: React.CSSProperties = {
  fontFamily: font.body,
  fontSize: 13.5,
  color: LINK_COL,
  textDecoration: "none",
};

function FLink({ children, to, href, style, ...rest }: {
  children: React.ReactNode; to?: string; href?: string;
  style?: React.CSSProperties; [k: string]: unknown;
}) {
  const merged = { style: { ...linkStyle, ...style }, hoverStyle: { color: "#fff" }, ...rest };
  if (to) return <Hoverable as={Link} to={to} {...merged}>{children}</Hoverable>;
  return <Hoverable as="a" href={href} {...merged}>{children}</Hoverable>;
}

function WaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function IgIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FbIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function SocialBtn({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Hoverable
      as="a" href={href} target="_blank" rel="noreferrer" aria-label={label}
      style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `1px solid rgba(255,255,255,.1)`,
        background: "rgba(255,255,255,.04)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: MUTED, textDecoration: "none",
        transition: "background .15s, color .15s, border-color .15s",
      }}
      hoverStyle={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.22)" }}
    >
      {children}
    </Hoverable>
  );
}

const NAV = [
  { label: "Inicio", to: "/" },
  { label: "Catálogo", to: "/catalogo" },
  { label: "Marcas", to: "/marcas" },
  { label: "Contacto", to: "/contacto" },
];

export function Footer() {
  const { isMobile } = useBreakpoint();
  return (
    <footer style={{ background: INK, position: "relative", overflow: "hidden" }}>

      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(0,87,217,.5) 40%, rgba(0,87,217,.5) 60%, transparent)",
        pointerEvents: "none",
      }} />

      {/* Glow */}
      <div style={{
        position: "absolute", top: -160, left: -60, width: 560, height: 560,
        background: "radial-gradient(circle, rgba(0,87,217,.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <Container>

        {/* ── Main body ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
          gap: isMobile ? 40 : 80,
          alignItems: "start",
          padding: isMobile ? "48px 0 36px" : "64px 0 52px",
          borderBottom: `1px solid ${RULE}`,
        }}>

          {/* Left — brand */}
          <div style={{ maxWidth: 400 }}>
            <div style={{ marginBottom: 22 }}>
              <Logo variant="dark" />
            </div>

            {/* Tagline */}
            <p style={{
              fontFamily: font.body, fontSize: 14, lineHeight: 1.75,
              color: MUTED, margin: "0 0 10px",
            }}>
              Distribuidora de repuestos automotrices en Mendoza. Atención personalizada, respuesta en menos de una hora.
            </p>

            {/* Location pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(0,87,217,.1)", border: "1px solid rgba(0,87,217,.2)",
              borderRadius: radius.pill, padding: "5px 14px",
              fontFamily: font.mono, fontSize: 11, color: "#5B8BDF", letterSpacing: ".08em",
              marginBottom: 28,
            }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              MENDOZA, ARGENTINA
            </div>

            {/* Socials */}
            <div style={{ display: "flex", gap: 8 }}>
              <SocialBtn href={contact.social.instagram} label="Instagram"><IgIcon /></SocialBtn>
              <SocialBtn href={contact.social.facebook} label="Facebook"><FbIcon /></SocialBtn>
              <SocialBtn href={waLink()} label="WhatsApp"><WaIcon /></SocialBtn>
            </div>
          </div>

          {/* Right — nav + contact + legal */}
          <div style={{ display: "flex", gap: isMobile ? 32 : 60, paddingTop: 4, flexWrap: isMobile ? "wrap" : "nowrap" }}>

            {/* Nav */}
            <div>
              <ColTitle>Menú</ColTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <FLink to="/">Inicio</FLink>
                <FLink to="/catalogo">Catálogo</FLink>
                <FLink to="/marcas">Marcas</FLink>
                <FLink to="/contacto">Contacto</FLink>
                <FLink to="/contacto">Preguntas frecuentes</FLink>
              </div>
            </div>

            {/* Legal — middle */}
            <div>
              <ColTitle>Legal</ColTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <FLink to="/legal/privacidad">Política de privacidad</FLink>
                <FLink to="/legal/terminos">Términos y condiciones</FLink>
                <FLink to="/legal/cookies">Política de cookies</FLink>
                <FLink to="/legal/licencias">Licencias</FLink>
                <FLink to="/legal/accesibilidad">Accesibilidad</FLink>
              </div>
            </div>

            {/* Contact — always rightmost */}
            <div style={{ borderLeft: isMobile ? "none" : `1px solid ${RULE}`, paddingLeft: isMobile ? 0 : 48 }}>
              <ColTitle>Contacto</ColTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <InfoRow label="WhatsApp" value={contact.phoneDisplay} href={waLink()} />
                <InfoRow label="Email" value={contact.email} href={`mailto:${contact.email}`} />
                <InfoRow label="Horario" value={contact.hours} />
                <InfoRow label="Ubicación" value={contact.city} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: isMobile ? "center" : "space-between",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 8 : 16, padding: "20px 0", flexWrap: "wrap",
          textAlign: isMobile ? "center" : "left",
        }}>
          <span style={{ fontFamily: font.mono, fontSize: 11, color: "#1E3148", letterSpacing: ".06em" }}>
            © {new Date().getFullYear()} CROW REPUESTOS · TODOS LOS DERECHOS RESERVADOS
          </span>
          <span style={{ fontFamily: font.mono, fontSize: 11, color: "#1E3148" }}>
            Hecho en Mendoza 🇦🇷
          </span>
        </div>
      </Container>
    </footer>
  );
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: font.mono, fontSize: 10, fontWeight: 700,
      letterSpacing: ".18em", color: "#283D52",
      textTransform: "uppercase", marginBottom: 22,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: font.mono, fontSize: 10, color: "#283D52",
        letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 3,
      }}>
        {label}
      </div>
      {href ? (
        <Hoverable
          as="a" href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          style={{ ...linkStyle, textDecoration: "none" }}
          hoverStyle={{ color: "#fff" }}
        >
          {value}
        </Hoverable>
      ) : (
        <span style={{ fontFamily: font.body, fontSize: 13.5, color: MUTED }}>{value}</span>
      )}
    </div>
  );
}
