import { Button } from "@/shared/ui";
import { contact, waLink } from "@/shared/config/contact";
import { color, font, radius } from "@/shared/config/theme";
import { Container } from "@/shared/ui";

function PhoneIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" /></svg>;
}
function MailIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}
function ClockIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

export function CtaFinal({ onQuote }: { onQuote: () => void }) {
  return (
    <section style={{ background: color.ink900, position: "relative", overflow: "hidden", padding: "88px 0" }}>
      {/* Glows */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(760px 380px at 82% 120%, rgba(0,87,217,.22), transparent 60%), radial-gradient(400px 300px at 10% -10%, rgba(0,47,130,.15), transparent 60%)" }} />

      <Container style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 56, alignItems: "center" }}>

          {/* Left — copy */}
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".14em", color: "#3A5A7A", marginBottom: 16 }}>
              ¿TENÉS EL REPUESTO EN MENTE?
            </div>
            <h2 style={{ fontFamily: font.display, fontSize: 42, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-.02em", color: "#fff", marginBottom: 18 }}>
              Cotizá en<br />minutos.
            </h2>
            <p style={{ fontFamily: font.body, fontSize: 16, lineHeight: 1.65, color: "#4E6B82", maxWidth: 440, marginBottom: 36 }}>
              Escribinos con tu vehículo y la pieza que buscás. Un asesor te responde con disponibilidad y precio real.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button as="a" href={waLink("Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.")} target="_blank" rel="noreferrer" variant="whatsapp" size="lg">
                Escribir por WhatsApp
              </Button>
              <Button onClick={onQuote} size="lg" variant="outline" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>
                Formulario de cotización
              </Button>
            </div>
          </div>

          {/* Right — contact card */}
          <div style={{
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "16px 22px",
              borderBottom: "1px solid rgba(255,255,255,.06)",
              background: "rgba(0,87,217,.1)",
            }}>
              <span style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: ".14em", color: color.primary }}>
                CONTACTO DIRECTO
              </span>
            </div>

            {[
              { Icon: PhoneIcon, label: "Teléfono", value: contact.phoneDisplay, href: `tel:${contact.phone}` },
              { Icon: MailIcon,  label: "Correo",   value: contact.email,        href: `mailto:${contact.email}` },
              { Icon: ClockIcon, label: "Horario",  value: contact.hours,        href: undefined },
            ].map(({ Icon, label, value, href }, i, arr) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "18px 22px",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: "rgba(255,255,255,.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#5A8BB0",
                }}>
                  <Icon />
                </div>
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: "#2A3F52", letterSpacing: ".08em", marginBottom: 3 }}>{label.toUpperCase()}</div>
                  {href ? (
                    <a href={href} style={{ fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: "#C4D4E0", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#C4D4E0")}
                    >{value}</a>
                  ) : (
                    <span style={{ fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: "#C4D4E0" }}>{value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </Container>
    </section>
  );
}
