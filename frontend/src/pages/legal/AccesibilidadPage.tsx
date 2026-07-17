import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";
import { useSiteSettings } from "@/entities/settings/useSiteSettings";

const CHECKS = [
  { ok: true, label: "Contraste de color", desc: "Todos los textos cumplen ratio mínimo WCAG AA (4.5:1 en texto normal, 3:1 en texto grande)." },
  { ok: true, label: "Texto alternativo", desc: "Las imágenes funcionales incluyen atributo alt descriptivo." },
  { ok: true, label: "Navegación por teclado", desc: "Todos los controles interactivos son accesibles con Tab y Enter." },
  { ok: true, label: "Etiquetas semánticas", desc: "Se usan elementos HTML semánticos: header, nav, main, footer, article." },
  { ok: true, label: "Formularios etiquetados", desc: "Cada campo de formulario tiene su label asociado correctamente." },
  { ok: false, label: "Lector de pantalla (ARIA)", desc: "En proceso de mejora. Algunos componentes dinámicos aún carecen de roles ARIA completos." },
  { ok: false, label: "Skip links", desc: "Próximamente. Se agregarán enlaces para saltar al contenido principal." },
];

export function AccesibilidadPage() {
  const contact = useSiteSettings();
  return (
    <LegalLayout title="Accesibilidad" updated="1 de junio de 2026">
      <InfoBox>
        Crow Repuestos se compromete a hacer su sitio web accesible para todas las personas, independientemente de sus capacidades o del dispositivo que utilicen.
      </InfoBox>

      <H2>Nuestro compromiso</H2>
      <P>
        Trabajamos para que el sitio web cumpla con las pautas de accesibilidad <strong>WCAG 2.1 nivel AA</strong> del W3C. Esto incluye usuarios con discapacidades visuales, auditivas, motoras o cognitivas.
      </P>

      <H2>Estado de accesibilidad</H2>
      <P>A continuación el estado actual de los aspectos más importantes:</P>

      <div className="flex flex-col gap-2.5 mb-7">
        {CHECKS.map((c) => (
          <div
            key={c.label}
            className={`flex items-start gap-3.5 py-3.5 px-4 rounded-md border ${c.ok ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FFFBEB] border-[#FDE68A]"}`}
          >
            <div className={`w-[22px] h-[22px] rounded-full shrink-0 mt-px flex items-center justify-center text-white text-xs font-bold ${c.ok ? "bg-success" : "bg-[#D97706]"}`}>
              {c.ok ? "✓" : "~"}
            </div>
            <div>
              <div className="font-body text-sm font-semibold text-ink800 mb-[3px]">{c.label}</div>
              <div className="font-body text-[13px] text-textMuted">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <H2>Tecnologías de asistencia compatibles</H2>
      <UL>
        <li>Navegadores modernos: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+.</li>
        <li>Lectores de pantalla: NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android) — compatibilidad parcial.</li>
        <li>Navegación por teclado: completamente funcional en los flujos principales.</li>
        <li>Zoom del navegador: el diseño responde correctamente hasta 200% de zoom.</li>
      </UL>

      <H2>Limitaciones conocidas</H2>
      <P>
        Somos conscientes de las siguientes áreas de mejora activas:
      </P>
      <UL>
        <li>Algunos modales y drawers aún no gestionan el foco de forma óptima al abrirse y cerrarse.</li>
        <li>Los mensajes de error en formularios no siempre se anuncian automáticamente a lectores de pantalla.</li>
        <li>Las tablas de datos en el catálogo carecen de resúmenes descriptivos.</li>
      </UL>

      <H2>Cómo reportar un problema</H2>
      <P>
        Si encontrás una barrera de accesibilidad en nuestro sitio, te pedimos que nos lo hagas saber. Tu feedback nos ayuda a mejorar:
      </P>
      <UL>
        <li>Email: <a href={`mailto:${contact.email}`} className="text-primary">{contact.email}</a></li>
        <li>WhatsApp: <a href={`https://wa.me/${contact.whatsapp_number}`} target="_blank" rel="noreferrer" className="text-primary">{contact.phone_display}</a></li>
      </UL>
      <P>
        Intentamos responder en un plazo de 5 días hábiles y trabajar en una solución dentro de los 30 días siguientes.
      </P>

      <H2>Próximas mejoras</H2>
      <P>
        Tenemos planificadas las siguientes mejoras de accesibilidad para los próximos meses:
      </P>
      <UL>
        <li>Agregar skip links al inicio del documento.</li>
        <li>Completar los roles ARIA en componentes dinámicos (modales, drawers, tooltips).</li>
        <li>Auditoría completa con herramientas automáticas (axe-core) integrada al proceso de desarrollo.</li>
        <li>Test manual con lectores de pantalla NVDA y VoiceOver.</li>
      </UL>
    </LegalLayout>
  );
}
