import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";
import { color, font, radius } from "@/shared/config/theme";

type CookieRow = { nombre: string; tipo: string; duración: string; finalidad: string };

const COOKIES: CookieRow[] = [
  { nombre: "crow_auth",      tipo: "Esencial",    duración: "Sesión",  finalidad: "Mantiene la sesión autenticada del usuario." },
  { nombre: "crow_refresh",   tipo: "Esencial",    duración: "30 días", finalidad: "Token de renovación de sesión seguro (httpOnly)." },
  { nombre: "_ga",            tipo: "Analítica",   duración: "2 años",  finalidad: "Google Analytics — estadísticas de uso anónimas." },
  { nombre: "_ga_*",          tipo: "Analítica",   duración: "2 años",  finalidad: "Identificador de sesión de Google Analytics." },
  { nombre: "cookie_consent", tipo: "Preferencia", duración: "1 año",   finalidad: "Guarda tu decisión sobre el uso de cookies." },
];

const TONE: Record<string, string> = {
  Esencial:    color.primary,
  Analítica:   "#7C3AED",
  Preferencia: "#D97706",
};

export function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updated="1 de junio de 2026">
      <InfoBox>
        Usamos cookies para que el sitio funcione correctamente y para entender cómo lo utilizan nuestros visitantes. Esta política explica qué cookies usamos y cómo podés controlarlas.
      </InfoBox>

      <H2>¿Qué es una cookie?</H2>
      <P>
        Una cookie es un pequeño archivo de texto que se almacena en tu dispositivo cuando visitás un sitio web. Las cookies permiten que el sitio recuerde tus preferencias y mantenga tu sesión activa entre visitas.
      </P>

      <H2>Tipos de cookies que usamos</H2>

      <div style={{ marginBottom: 24 }}>
        {[
          { tipo: "Esenciales", color: color.primary, desc: "Necesarias para que el sitio funcione. No pueden desactivarse." },
          { tipo: "Analíticas", color: "#7C3AED", desc: "Nos ayudan a entender cómo se usa el sitio, de forma anónima." },
          { tipo: "Preferencias", color: "#D97706", desc: "Recuerdan tus elecciones (por ejemplo, consentimiento de cookies)." },
        ].map((t) => (
          <div key={t.tipo} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, marginTop: 6, flexShrink: 0 }} />
            <div>
              <strong style={{ fontFamily: font.body, fontSize: 14, color: t.color }}>{t.tipo}</strong>
              <span style={{ fontFamily: font.body, fontSize: 14, color: "#475569" }}> — {t.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <H2>Detalle de cookies</H2>

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.body, fontSize: 13.5 }}>
          <thead>
            <tr>
              {["Nombre", "Tipo", "Duración", "Finalidad"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontFamily: font.mono, fontSize: 10, letterSpacing: ".12em",
                  color: color.textFaint, textTransform: "uppercase", padding: "10px 14px",
                  borderBottom: `2px solid ${color.border}`, background: color.surface,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c, i) => (
              <tr key={c.nombre} style={{ background: i % 2 === 0 ? "#fff" : color.surface }}>
                <td style={{ padding: "12px 14px", fontFamily: font.mono, fontSize: 12, color: color.ink800, borderBottom: `1px solid ${color.border}` }}>
                  {c.nombre}
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${color.border}` }}>
                  <span style={{
                    display: "inline-block", padding: "2px 10px",
                    borderRadius: radius.pill, fontSize: 11, fontWeight: 600,
                    background: `${TONE[c.tipo]}18`, color: TONE[c.tipo],
                    border: `1px solid ${TONE[c.tipo]}30`,
                  }}>
                    {c.tipo}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: color.textMuted, borderBottom: `1px solid ${color.border}` }}>{c.duración}</td>
                <td style={{ padding: "12px 14px", color: color.textMuted, borderBottom: `1px solid ${color.border}` }}>{c.finalidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2>Cómo controlar las cookies</H2>
      <P>Podés gestionar las cookies de las siguientes formas:</P>
      <UL>
        <li><strong>Configuración del navegador:</strong> todos los navegadores modernos permiten bloquear o eliminar cookies desde sus ajustes de privacidad.</li>
        <li><strong>Opt-out de analíticas:</strong> podés instalar el complemento de inhabilitación de Google Analytics disponible en <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer" style={{ color: color.primary }}>tools.google.com/dlpage/gaoptout</a>.</li>
        <li><strong>Preferencias del sitio:</strong> podés revocar tu consentimiento en cualquier momento borrando la cookie <code style={{ fontFamily: font.mono, fontSize: 12, background: color.border, padding: "1px 6px", borderRadius: "3px" }}>cookie_consent</code> desde tu navegador.</li>
      </UL>

      <P>
        Desactivar las cookies esenciales puede afectar el funcionamiento del sitio, incluyendo la posibilidad de mantener tu sesión iniciada.
      </P>
    </LegalLayout>
  );
}
