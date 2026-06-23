import { color, font } from "@/shared/config/theme";
import { waLink } from "@/shared/config/contact";
import { Container, Icon, type IconName } from "@/shared/ui";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

const CHIPS: { icon: IconName; label: string }[] = [
  { icon: "shieldCheck", label: "Garantía incluida" },
  { icon: "clock", label: "Respuesta en < 1 hora" },
  { icon: "wrench", label: "Asesoría técnica" },
];

const WA_MSG = "Hola Crow Repuestos! Necesito consultar un repuesto.";

export function Hero({ onQuote }: { onQuote: () => void }) {
  const { isMobile } = useBreakpoint();
  return (
    <section style={{ background: color.ink900, position: "relative", overflow: "hidden" }}>
      {/* Background layers */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(900px 500px at 75% -5%, rgba(0,87,217,.28), transparent 60%), " +
            "radial-gradient(600px 400px at 10% 110%, rgba(0,47,130,.2), transparent 60%), " +
            "linear-gradient(180deg, rgba(7,17,31,0) 50%, rgba(7,17,31,.75))",
        }}
      />

      <Container style={{ position: "relative" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.1fr .9fr",
            gap: isMobile ? 0 : 64,
            alignItems: "center",
            padding: isMobile ? "60px 0 52px" : "96px 0 88px",
            minHeight: isMobile ? "auto" : 560,
          }}
        >
          {/* ── Copy ─────────────────────────────── */}
          <div style={{ animation: "fadeUp .6s ease both" }}>
            {/* Eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,87,217,.18)",
                border: "1px solid rgba(0,87,217,.35)",
                borderRadius: 999,
                padding: "5px 14px 5px 10px",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: color.primary,
                  animation: "pulse-glow 2s ease infinite",
                }}
              />
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  color: "#7FB0FF",
                }}
              >
                REPUESTOS · LUBRICANTES · MENDOZA
              </span>
            </div>

            <h1
              style={{
                fontFamily: font.display,
                fontSize: isMobile ? 38 : 60,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-.025em",
                color: "#fff",
                marginBottom: 22,
              }}
            >
              Todo para tu
              <br />
              vehículo en
              <br />
              <span
                style={{
                  background: "linear-gradient(95deg, #7FB0FF 0%, #0057D9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                un solo lugar.
              </span>
            </h1>

            <p
              style={{
                fontFamily: font.body,
                fontSize: 17.5,
                lineHeight: 1.65,
                color: color.textOnDark,
                maxWidth: 490,
                marginBottom: 38,
              }}
            >
              Repuestos, lubricantes, baterías y detailing para autos, motos y
              camiones. Atención personalizada en Mendoza ciudad.
            </p>

            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {/* WhatsApp CTA — primary */}
              <a
                href={waLink(WA_MSG)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#25D366",
                  color: "#fff",
                  fontFamily: font.display,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "13px 26px",
                  textDecoration: "none",
                  boxShadow: "0 6px 24px rgba(37,211,102,.35)",
                  transition: "transform .18s ease, box-shadow .18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                    "0 10px 32px rgba(37,211,102,.45)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = "none";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                    "0 6px 24px rgba(37,211,102,.35)";
                }}
              >
                {/* WhatsApp SVG icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Escribir por WhatsApp
              </a>

              <button
                onClick={onQuote}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.22)",
                  fontFamily: font.display,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "13px 26px",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                  transition: "background .18s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,.06)";
                }}
              >
                Pedir cotización
              </button>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 36 }}>
              {CHIPS.map((c) => (
                <span
                  key={c.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: font.body,
                    fontSize: 13,
                    color: color.textOnDarkFaint,
                  }}
                >
                  <span style={{ color: color.primary }}>
                    <Icon name={c.icon} size={15} />
                  </span>
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── WhatsApp mockup — hidden on mobile ── */}
          {!isMobile && <div style={{ position: "relative", animation: "fadeUp .75s .15s ease both" }}>
            {/* Glow */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: 340,
                height: 340,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(37,211,102,.25) 0%, transparent 70%)",
                filter: "blur(48px)",
                pointerEvents: "none",
              }}
            />

            {/* Chat window */}
            <div
              style={{
                position: "relative",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 32px 80px rgba(0,0,0,.5)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "#075E54",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "#128C7E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/crow-logo.png"
                    alt="Crow"
                    style={{ width: 28, height: 28, objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: font.display,
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.2,
                    }}
                  >
                    Crow Repuestos
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 11.5, color: "rgba(255,255,255,.7)" }}>
                    En línea · Responde en minutos
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.6)">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
              </div>

              {/* Chat body */}
              <div
                style={{
                  background: "#ECE5DD",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 240,
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='%23d4cfc7' fill-opacity='.07'/%3E%3C/svg%3E\")",
                }}
              >
                {/* User message */}
                <div style={{ display: "flex", justifyContent: "flex-end", animation: "fadeUp .5s .5s ease both", opacity: 0 }}>
                  <div
                    style={{
                      background: "#DCF8C6",
                      borderRadius: "14px 14px 4px 14px",
                      padding: "10px 14px",
                      maxWidth: "80%",
                      boxShadow: "0 1px 2px rgba(0,0,0,.15)",
                    }}
                  >
                    <p style={{ fontFamily: font.body, fontSize: 13.5, color: "#1a1a1a", margin: 0, lineHeight: 1.45 }}>
                      Hola! Necesito frenos para mi VW Gol 2019 🔧
                    </p>
                    <div style={{ textAlign: "right", marginTop: 4, fontFamily: font.mono, fontSize: 10, color: "#7a8f7a" }}>
                      14:32 ✓✓
                    </div>
                  </div>
                </div>

                {/* Typing indicator */}
                <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp .5s .9s ease both", opacity: 0 }}>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "14px 14px 14px 4px",
                      padding: "12px 16px",
                      boxShadow: "0 1px 2px rgba(0,0,0,.1)",
                      display: "flex",
                      gap: 5,
                      alignItems: "center",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#9E9E9E",
                          animation: `pulse-glow 1.2s ${i * 0.2}s ease infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Response */}
                <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp .5s 1.4s ease both", opacity: 0 }}>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "14px 14px 14px 4px",
                      padding: "10px 14px",
                      maxWidth: "85%",
                      boxShadow: "0 1px 2px rgba(0,0,0,.1)",
                    }}
                  >
                    <p style={{ fontFamily: font.body, fontSize: 13.5, color: "#1a1a1a", margin: 0, lineHeight: 1.5 }}>
                      ¡Hola! Tenemos kit de frenos delanteros para el Gol G5. Te lo llevamos hoy en Mendoza ciudad 🚚
                    </p>
                    <div style={{ textAlign: "right", marginTop: 4, fontFamily: font.mono, fontSize: 10, color: "#999" }}>
                      14:33
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div
                style={{
                  background: "#F0F0F0",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderTop: "1px solid rgba(0,0,0,.08)",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: "#fff",
                    borderRadius: 999,
                    padding: "9px 16px",
                    fontFamily: font.body,
                    fontSize: 13,
                    color: "#999",
                  }}
                >
                  Escribí tu consulta...
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#25D366",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating badge — response time */}
            <div
              style={{
                position: "absolute",
                top: -18,
                right: -22,
                background: "#fff",
                borderRadius: 12,
                padding: "10px 16px",
                boxShadow: "0 12px 36px rgba(0,0,0,.28)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                animation: "fadeUp .7s .3s ease both",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#DCFCE7",
                  color: "#15803D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flex: "none",
                }}
              >
                ⚡
              </span>
              <div>
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: color.ink900,
                    lineHeight: 1,
                    marginBottom: 3,
                  }}
                >
                  &lt; 1 hora
                </div>
                <div style={{ fontFamily: font.body, fontSize: 11, color: color.textMuted }}>
                  tiempo de respuesta
                </div>
              </div>
            </div>

            {/* Floating badge — location */}
            <div
              style={{
                position: "absolute",
                left: -28,
                bottom: -22,
                background: "#11223A",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 12,
                boxShadow: "0 24px 60px rgba(0,0,0,.5)",
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: "fadeUp .7s .4s ease both",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  flex: "none",
                  borderRadius: 10,
                  background: "rgba(0,87,217,.2)",
                  color: "#7FB0FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="mapPin" size={19} strokeWidth={1.5} />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: font.body,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 3,
                  }}
                >
                  Mendoza ciudad
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 10, color: "#25D366", letterSpacing: ".05em" }}>
                  ENTREGA EL MISMO DÍA
                </div>
              </div>
            </div>
          </div>}
        </div>
      </Container>

    </section>
  );
}
