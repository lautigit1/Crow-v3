import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";

type CookieRow = { nombre: string; tipo: string; duración: string; finalidad: string };

const COOKIES: CookieRow[] = [
  { nombre: "crow_auth", tipo: "Esencial", duración: "Sesión", finalidad: "Mantiene la sesión autenticada del usuario." },
  { nombre: "crow_refresh", tipo: "Esencial", duración: "30 días", finalidad: "Token de renovación de sesión seguro (httpOnly)." },
  { nombre: "_ga", tipo: "Analítica", duración: "2 años", finalidad: "Google Analytics — estadísticas de uso anónimas." },
  { nombre: "_ga_*", tipo: "Analítica", duración: "2 años", finalidad: "Identificador de sesión de Google Analytics." },
  { nombre: "cookie_consent", tipo: "Preferencia", duración: "1 año", finalidad: "Guarda tu decisión sobre el uso de cookies." },
];

// Both maps are keyed off a fixed, small set of category names (3), so each
// tone's colors are precomputed literal Tailwind classes rather than
// interpolated from a hex constant.
const TONE_BADGE: Record<string, string> = {
  Esencial: "bg-[#0057D918] text-primary border-[#0057D930]",
  Analítica: "bg-[#7C3AED18] text-[#7C3AED] border-[#7C3AED30]",
  Preferencia: "bg-[#D9770618] text-[#D97706] border-[#D9770630]",
};

const CATEGORY_INFO = [
  { tipo: "Esenciales", dot: "bg-primary", text: "text-primary", desc: "Necesarias para que el sitio funcione. No pueden desactivarse." },
  { tipo: "Analíticas", dot: "bg-[#7C3AED]", text: "text-[#7C3AED]", desc: "Nos ayudan a entender cómo se usa el sitio, de forma anónima." },
  { tipo: "Preferencias", dot: "bg-[#D97706]", text: "text-[#D97706]", desc: "Recuerdan tus elecciones (por ejemplo, consentimiento de cookies)." },
];

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

      <div className="mb-6">
        {CATEGORY_INFO.map((t) => (
          <div key={t.tipo} className="flex items-start gap-3.5 mb-3.5">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${t.dot}`} />
            <div>
              <strong className={`font-body text-sm ${t.text}`}>{t.tipo}</strong>
              <span className="font-body text-sm text-[#475569]"> — {t.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <H2>Detalle de cookies</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse font-body text-[13.5px]">
          <thead>
            <tr>
              {["Nombre", "Tipo", "Duración", "Finalidad"].map((h) => (
                <th key={h} className="text-left font-mono text-[10px] tracking-[.12em] text-textFaint uppercase py-2.5 px-3.5 border-b-2 border-border bg-surface">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c, i) => (
              <tr key={c.nombre} className={i % 2 === 0 ? "bg-white" : "bg-surface"}>
                <td className="py-3 px-3.5 font-mono text-xs text-ink800 border-b border-border">
                  {c.nombre}
                </td>
                <td className="py-3 px-3.5 border-b border-border">
                  <span className={`inline-block py-0.5 px-2.5 rounded-full text-[11px] font-semibold border ${TONE_BADGE[c.tipo]}`}>
                    {c.tipo}
                  </span>
                </td>
                <td className="py-3 px-3.5 text-textMuted border-b border-border">{c.duración}</td>
                <td className="py-3 px-3.5 text-textMuted border-b border-border">{c.finalidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2>Cómo controlar las cookies</H2>
      <P>Podés gestionar las cookies de las siguientes formas:</P>
      <UL>
        <li><strong>Configuración del navegador:</strong> todos los navegadores modernos permiten bloquear o eliminar cookies desde sus ajustes de privacidad.</li>
        <li><strong>Opt-out de analíticas:</strong> podés instalar el complemento de inhabilitación de Google Analytics disponible en <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer" className="text-primary">tools.google.com/dlpage/gaoptout</a>.</li>
        <li><strong>Preferencias del sitio:</strong> podés revocar tu consentimiento en cualquier momento borrando la cookie <code className="font-mono text-xs bg-border py-px px-1.5 rounded-[3px]">cookie_consent</code> desde tu navegador.</li>
      </UL>

      <P>
        Desactivar las cookies esenciales puede afectar el funcionamiento del sitio, incluyendo la posibilidad de mantener tu sesión iniciada.
      </P>
    </LegalLayout>
  );
}
