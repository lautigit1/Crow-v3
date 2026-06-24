import { Button } from "@/shared/ui";
import { contact, waLink } from "@/shared/config/contact";
import { color, font } from "@/shared/config/theme";
import { Container } from "@/shared/ui";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const WA_MSG = "Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.";

export function CtaFinal({ onQuote }: { onQuote: () => void }) {
  const { isMobile } = useBreakpoint();

  return (
    <section style={{
      background: color.ink900,
      position: "relative",
      overflow: "hidden",
      padding: isMobile ? "72px 0 60px" : "104px 0 88px",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage:
          "radial-gradient(700px 500px at 50% 110%, rgba(0,87,217,.2), transparent 60%)",
      }} />

      {/* Top border accent */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 1,
        background: `linear-gradient(90deg, transparent, ${color.primary}, transparent)`,
      }} />

      <Container style={{ position: "relative" }}>
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>

          {/* Eyebrow */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 28,
          }}>
            <div style={{ width: 20, height: 1, background: "rgba(255,255,255,.2)" }} />
            <span style={{
              fontFamily: font.mono,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".18em",
              color: "rgba(255,255,255,.35)",
              textTransform: "uppercase",
            }}>
              ¿Tenés el repuesto en mente?
            </span>
            <div style={{ width: 20, height: 1, background: "rgba(255,255,255,.2)" }} />
          </div>

          {/* Headline */}
          <h2 style={{
            fontFamily: font.display,
            fontSize: isMobile ? 36 : 62,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-.03em",
            color: "#fff",
            marginBottom: 24,
          }}>
            Cotizá
            <br />
            <span style={{
              background: "linear-gradient(95deg, #7FB0FF 0%, #4A90E2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "inline-block",
              paddingBottom: "0.1em",
            }}>
              ahora.
            </span>
          </h2>

          {/* Subtext */}
          <p style={{
            fontFamily: font.body,
            fontSize: isMobile ? 15 : 17,
            lineHeight: 1.65,
            color: "rgba(255,255,255,.4)",
            marginBottom: 40,
          }}>
            Escribinos con tu vehículo y la pieza que buscás.
            <br />
            Un asesor real te responde con precio y disponibilidad.
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 56,
          }}>
            <Button
              as="a"
              href={waLink(WA_MSG)}
              target="_blank"
              rel="noreferrer"
              variant="whatsapp"
              size="lg"
            >
              Escribir por WhatsApp
            </Button>
            <Button
              onClick={onQuote}
              size="lg"
              variant="outline"
              style={{
                background: "transparent",
                color: "#fff",
                borderColor: "rgba(255,255,255,.18)",
              }}
            >
              Formulario de cotización
            </Button>
          </div>

          {/* Divider */}
          <div style={{
            width: "100%",
            height: 1,
            background: "rgba(255,255,255,.06)",
            marginBottom: 32,
          }} />

          {/* Contact row */}
          <div style={{
            display: "flex",
            gap: isMobile ? 20 : 40,
            justifyContent: "center",
            flexWrap: "wrap",
            alignItems: "center",
          }}>
            <ContactItem
              icon={<PhoneIcon />}
              href={`tel:${contact.phoneTel}`}
              label={contact.phoneDisplay}
            />
            <Dot />
            <ContactItem
              icon={<MailIcon />}
              href={`mailto:${contact.email}`}
              label={contact.email}
            />
            <Dot />
            <ContactItem
              icon={<ClockIcon />}
              label={contact.hours}
            />
          </div>

        </div>
      </Container>
    </section>
  );
}

function Dot() {
  return (
    <div style={{
      width: 3, height: 3, borderRadius: "50%",
      background: "rgba(255,255,255,.15)", flexShrink: 0,
    }} />
  );
}

function ContactItem({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) {
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: font.body,
    fontSize: 13.5,
    fontWeight: 500,
    color: "rgba(255,255,255,.4)",
    textDecoration: "none",
    transition: "color .15s",
  };

  const content = (
    <>
      <span style={{ color: "rgba(255,255,255,.2)", display: "flex" }}>{icon}</span>
      {label}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        style={style}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.75)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}
      >
        {content}
      </a>
    );
  }
  return <span style={style}>{content}</span>;
}

function PhoneIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" /></svg>;
}
function MailIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}
function ClockIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
