import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LegalDocument, P, UL, A, Dato, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

/**
 * Política de desarrollo y mantenimiento.
 *
 * Describe cómo está hecha y cómo se mantiene la plataforma sin prometer lo
 * que nadie confirmó: no hay SLA, ni porcentaje de disponibilidad, ni plazo
 * de respuesta de soporte acordado. Si alguno se define, se agrega acá con
 * su fuente.
 */
export function DesarrolloMantenimientoPage() {
  const contact = useSiteSettings();

  const sections: LegalSection[] = [
    {
      id: "alcance",
      title: "Alcance",
      content: (
        <P>
          Este documento describe las condiciones técnicas en las que funciona el sitio de Crow
          Repuestos: cómo se desarrolla y actualiza, de qué servicios externos depende y qué
          limitaciones tiene. No modifica los{" "}
          <A href={legalPath("terminos")}>términos y condiciones</A> ni crea obligaciones de
          disponibilidad distintas de las que ahí se establecen.
        </P>
      ),
    },
    {
      id: "plataforma",
      title: "Características de la plataforma",
      content: (
        <>
          <P>La plataforma es una aplicación web propia formada por:</P>
          <UL>
            <li>un sitio público con catálogo, fichas de producto, cotizaciones, carrito y pedidos;</li>
            <li>un área de cliente con perfil, pedidos, cotizaciones, favoritos y notificaciones;</li>
            <li>un panel de administración para el catálogo, el stock, las cotizaciones y los pedidos;</li>
            <li>un servidor de aplicación y una base de datos PostgreSQL que guardan esa información.</li>
          </UL>
        </>
      ),
    },
    {
      id: "actualizaciones",
      title: "Actualizaciones y mejoras",
      content: (
        <>
          <P>
            La plataforma se actualiza de forma continua para incorporar funciones, corregir errores y
            mantener al día sus componentes. Cada cambio pasa por pruebas automatizadas antes de
            publicarse.
          </P>
          <P>
            Las actualizaciones pueden cambiar la apariencia o el funcionamiento de algunas pantallas.
            Si un cambio afecta la forma en que se tratan datos personales o las condiciones de uso, se
            actualizan además los documentos legales correspondientes.
          </P>
        </>
      ),
    },
    {
      id: "mantenimiento",
      title: "Mantenimiento preventivo y correctivo",
      content: (
        <UL>
          <li>
            <strong className="font-medium text-ink900">Preventivo:</strong> actualización de dependencias
            con parches de seguridad, revisión de vulnerabilidades conocidas y copias de seguridad
            periódicas de la base de datos, con la frecuencia que se configure en el servidor.
          </li>
          <li>
            <strong className="font-medium text-ink900">Correctivo:</strong> corrección de errores
            detectados por el equipo, por los registros del sistema o por avisos de quienes usan el
            sitio.
          </li>
        </UL>
      ),
    },
    {
      id: "errores",
      title: "Corrección de errores",
      content: (
        <P>
          Los errores se priorizan según su efecto: primero los que comprometen la seguridad o los
          datos, después los que impiden cotizar o hacer un pedido, y luego el resto. No hay un plazo de
          corrección comprometido. Si un error afectó una cotización o un pedido tuyo, el comercio lo
          revisa con vos por los canales de contacto.
        </P>
      ),
    },
    {
      id: "compatibilidad",
      title: "Compatibilidad con navegadores y dispositivos",
      content: (
        <P>
          El sitio está pensado para las versiones actuales de Chrome, Firefox, Safari y Edge, en
          computadoras, tablets y teléfonos. Versiones antiguas o navegadores poco comunes pueden
          mostrar diferencias o no admitir algunas funciones. Para iniciar sesión el navegador tiene que
          aceptar cookies del sitio (ver la <A href={legalPath("cookies")}>política de cookies</A>).
        </P>
      ),
    },
    {
      id: "disponibilidad",
      title: "Disponibilidad e interrupciones",
      content: (
        <>
          <P>
            El titular procura que el sitio esté disponible de forma continua, pero no garantiza un
            nivel de disponibilidad determinado. Puede haber interrupciones por:
          </P>
          <UL>
            <li>mantenimiento programado, que se procura hacer en horarios de poco uso;</li>
            <li>fallas del servidor, de la red o de los servicios externos de los que depende;</li>
            <li>medidas urgentes de seguridad.</li>
          </UL>
          <P>
            Si el sitio no está disponible, podés seguir consultando por WhatsApp al{" "}
            {contact.phone_display} o por email a{" "}
            <A href={`mailto:${contact.email}`}>{contact.email}</A>.
          </P>
        </>
      ),
    },
    {
      id: "terceros",
      title: "Dependencias de terceros",
      content: (
        <>
          <P>El funcionamiento del sitio depende de servicios externos:</P>
          <UL>
            <li>hosting del servidor y la base de datos: <Dato campo="proveedorHosting" />;</li>
            <li>envío de emails: <Dato campo="proveedorCorreo" />;</li>
            <li>almacenamiento y entrega de imágenes de producto: Cloudinary;</li>
            <li>atención por mensajería: WhatsApp.</li>
          </UL>
          <P>
            Una falla de alguno de estos servicios puede afectar parte del sitio aunque la plataforma
            funcione bien. El titular no controla su disponibilidad.
          </P>
        </>
      ),
    },
    {
      id: "limitaciones",
      title: "Cambios técnicos y limitaciones",
      content: (
        <UL>
          <li>Precios y stock se cargan desde el sistema de gestión del comercio y pueden diferir de la realidad hasta su confirmación.</li>
          <li>Los emails pueden demorarse o ser filtrados como correo no deseado por tu proveedor.</li>
          <li>Las notificaciones en tiempo real requieren mantener la página abierta y una conexión estable.</li>
          <li>Funciones, pantallas o integraciones pueden modificarse o discontinuarse; los cambios que afecten tus derechos se reflejan en los documentos legales.</li>
        </UL>
      ),
    },
    {
      id: "seguridad",
      title: "Seguridad e infraestructura",
      content: (
        <P>
          La conexión al sitio es cifrada, las contraseñas se guardan solo como hash y el acceso al panel
          de administración está restringido por rol. El detalle de las medidas que protegen datos
          personales está en la <A href={legalPath("privacidad")}>política de privacidad</A>. Si
          encontrás una vulnerabilidad, avisanos en privado por email antes de difundirla, así podemos
          corregirla.
        </P>
      ),
    },
    {
      id: "responsabilidades",
      title: "Responsabilidades",
      content: (
        <P>
          El titular responde por el funcionamiento de la plataforma en los términos de la legislación
          vigente. No responde por fallas atribuibles al equipo, la conexión o el navegador de quien usa
          el sitio, ni por las de servicios de terceros fuera de su control razonable, en la medida en
          que la ley lo permite y sin afectar los derechos de los consumidores.
        </P>
      ),
    },
    {
      id: "soporte",
      title: "Canales de comunicación y soporte",
      content: (
        <P>
          Para reportar un error o un problema técnico escribinos por email o WhatsApp contando qué
          estabas haciendo, en qué página, y desde qué dispositivo y navegador. Respondemos dentro del
          horario de atención ({contact.hours}). No hay un plazo de respuesta comprometido.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="desarrollo-y-mantenimiento"
      intro={
        <p>
          Cómo se construye, se actualiza y se mantiene la plataforma de Crow Repuestos, de qué depende
          para funcionar y qué podés esperar si algo falla.
        </p>
      }
      sections={sections}
    />
  );
}
