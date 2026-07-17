import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";

type CookieRow = { nombre: string; tipo: string; duración: string; finalidad: string };

// Cookies reales que emite el backend (ver backend/app/core/cookies.py) --
// antes esta tabla listaba `crow_auth`/`crow_refresh` y cookies de Google
// Analytics (`_ga`, `_ga_*`) más una `cookie_consent` que nunca existieron
// en el sitio real. El sitio no tiene integrado ningún analytics de
// terceros ni un banner de consentimiento, así que esta página ahora
// describe únicamente lo que la app efectivamente hace.
const COOKIES: CookieRow[] = [
  { nombre: "access_token", tipo: "Esencial", duración: "30 minutos", finalidad: "Mantiene la sesión autenticada del usuario (HttpOnly, no accesible desde JavaScript)." },
  { nombre: "refresh_token", tipo: "Esencial", duración: "7 días", finalidad: "Renueva la sesión sin pedir el login de nuevo (HttpOnly, no accesible desde JavaScript)." },
];

// Ambas usan un mismo tono porque hoy solo existe una categoría real
// (cookies esenciales) -- ver comentario arriba.
const TONE_BADGE: Record<string, string> = {
  Esencial: "bg-[#0057D918] text-primary border-[#0057D930]",
};

export function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updated="15 de julio de 2026">
      <InfoBox>
        Usamos únicamente las cookies estrictamente necesarias para que el sitio funcione: mantener tu sesión iniciada. No usamos cookies de analítica, publicidad ni seguimiento de terceros.
      </InfoBox>

      <H2>¿Qué es una cookie?</H2>
      <P>
        Una cookie es un pequeño archivo de texto que se almacena en tu dispositivo cuando visitás un sitio web. Las cookies permiten que el sitio recuerde tus preferencias y mantenga tu sesión activa entre visitas.
      </P>

      <H2>Qué cookies usamos (y qué no)</H2>
      <P>
        Crow Repuestos solo usa cookies <strong>esenciales</strong>, necesarias para que puedas iniciar sesión y mantenerla activa. No tenemos instalado Google Analytics ni ninguna otra herramienta de analítica o publicidad de terceros, así que no existen cookies de seguimiento que aceptar o rechazar.
      </P>

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

      <H2>Almacenamiento local (localStorage)</H2>
      <P>
        Además de las cookies de sesión, guardamos el contenido de tu carrito de compras en el almacenamiento local de tu navegador (localStorage), no en una cookie. Este dato vive solo en tu dispositivo, nunca se envía a otros sitios y se borra si vaciás el carrito, cerrás sesión o limpiás los datos del sitio desde la configuración de tu navegador.
      </P>

      <H2>Cómo controlar las cookies</H2>
      <P>
        Como usamos solo cookies esenciales, no hay nada que "aceptar" para navegar el catálogo: podés recorrer el sitio y ver productos sin iniciar sesión ni generar ninguna cookie. Si te registrás o iniciás sesión, podés controlar las cookies de las siguientes formas:
      </P>
      <UL>
        <li><strong>Cerrar sesión:</strong> el botón de cerrar sesión de tu cuenta elimina ambas cookies del navegador.</li>
        <li><strong>Configuración del navegador:</strong> todos los navegadores modernos permiten bloquear o eliminar cookies desde sus ajustes de privacidad.</li>
      </UL>

      <P>
        Ten en cuenta que bloquear o eliminar estas cookies va a cerrar tu sesión (o impedir que inicies sesión), ya que son las que mantienen tu cuenta autenticada.
      </P>
    </LegalLayout>
  );
}
