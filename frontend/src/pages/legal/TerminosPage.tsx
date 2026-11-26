import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LegalDocument, P, UL, H3, A, Dato, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

export function TerminosPage() {
  const contact = useSiteSettings();

  const sections: LegalSection[] = [
    {
      id: "titular",
      title: "Titular del sitio",
      content: (
        <>
          <P>
            Este sitio es operado por <Dato campo="razonSocial" />, CUIT <Dato campo="cuit" />, con
            domicilio legal en <Dato campo="domicilioLegal" />, que comercializa repuestos,
            lubricantes, baterías y productos de detailing para autos, motos y camiones bajo el nombre
            comercial Crow Repuestos, en la ciudad de Mendoza.
          </P>
          <P>
            Los datos completos del titular y los medios de contacto están en el{" "}
            <A href={legalPath("aviso-legal")}>aviso legal</A> y al final de este documento.
          </P>
        </>
      ),
    },
    {
      id: "objeto",
      title: "Objeto y alcance",
      content: (
        <>
          <P>Estos términos regulan el uso del sitio y de sus funciones, que hoy son:</P>
          <UL>
            <li>consultar el catálogo de productos, con precios de referencia y stock informado;</li>
            <li>solicitar una cotización mediante el formulario del sitio o por WhatsApp;</li>
            <li>crear una cuenta para seguir cotizaciones, guardar productos favoritos y armar un carrito;</li>
            <li>enviar un pedido desde el carrito, que queda sujeto a confirmación del comercio.</li>
          </UL>
          <P>
            El sitio no procesa pagos. La forma de pago y la entrega o el retiro se acuerdan con un
            asesor después de enviada la cotización o el pedido.
          </P>
          <P>
            Estos términos no reemplazan los derechos que te reconoce la Ley 24.240 de Defensa del
            Consumidor ni el Código Civil y Comercial de la Nación. Si alguna cláusula se opone a esas
            normas, prevalecen ellas.
          </P>
        </>
      ),
    },
    {
      id: "acceso",
      title: "Acceso y uso del sitio",
      content: (
        <>
          <P>
            Navegar el catálogo y pedir una cotización no requiere registrarse. Al usar el sitio te
            comprometés a hacerlo de buena fe y conforme a la ley, a estos términos y a la{" "}
            <A href={legalPath("privacidad")}>política de privacidad</A>.
          </P>
          <P>
            Para enviar una cotización o un pedido tenés que brindar datos veraces. Si la información
            del vehículo (marca, modelo, año, versión) es incorrecta, la cotización puede no
            corresponder a la pieza que necesitás.
          </P>
        </>
      ),
    },
    {
      id: "cuentas",
      title: "Cuentas de usuario",
      content: (
        <>
          <P>
            Para crear una cuenta te pedimos nombre completo, email, teléfono y una contraseña de al
            menos 10 caracteres. La cuenta es personal: sos responsable de mantener la contraseña en
            reserva y de la actividad que se realice con ella. Si sospechás un uso no autorizado,
            avisanos y cambiá la contraseña desde tu cuenta.
          </P>
          <P>
            Podés modificar tus datos desde la sección «Mi cuenta». Para dar de baja la cuenta,
            pedilo por los medios de contacto indicados al final; la baja se procesa según lo que
            describe la <A href={legalPath("privacidad")}>política de privacidad</A>.
          </P>
        </>
      ),
    },
    {
      id: "cotizaciones-y-pedidos",
      title: "Cotizaciones, pedidos y precios",
      content: (
        <>
          <H3>Precios de referencia</H3>
          <P>
            Los precios del catálogo son de referencia y pueden cambiar. El precio aplicable es el que
            te confirma un asesor en la cotización o al confirmar el pedido, con la forma de pago
            acordada. Los productos sin precio publicado figuran como «A consultar».
          </P>
          <H3>Stock</H3>
          <P>
            El stock que muestra el sitio se carga desde el sistema de gestión del comercio, pero puede
            diferir del disponible en el momento de la operación. La disponibilidad se confirma en
            cada caso.
          </P>
          <H3>Pedidos</H3>
          <P>
            Enviar un pedido desde el carrito no implica un cobro ni una venta cerrada: es una
            solicitud que el comercio revisa y confirma, rechaza o ajusta, y te avisa del estado por
            el sitio y por email. La venta se perfecciona cuando ambas partes acuerdan precio, forma
            de pago y entrega.
          </P>
          <H3>Derecho de revocación</H3>
          <P>
            En las ventas a distancia, la ley te reconoce el derecho a revocar la aceptación dentro de
            los diez días corridos desde la entrega del producto o la celebración del contrato, lo
            último que ocurra, en los términos del artículo 34 de la Ley 24.240 y los artículos 1110 y
            siguientes del Código Civil y Comercial. Para ejercerlo, escribinos por cualquiera de los
            medios de contacto.
          </P>
        </>
      ),
    },
    {
      id: "garantias",
      title: "Garantías de los productos",
      content: (
        <P>
          Los productos tienen la garantía legal que establece la Ley 24.240 y, cuando corresponda, la
          garantía del fabricante, cuyas condiciones y plazos se informan al momento de la venta. Para
          gestionar un reclamo de garantía, contactanos con el número de pedido o de cotización.
        </P>
      ),
    },
    {
      id: "obligaciones",
      title: "Obligaciones de quien usa el sitio",
      content: (
        <>
          <P>Al usar el sitio te comprometés a no:</P>
          <UL>
            <li>brindar datos falsos o de terceros sin su autorización;</li>
            <li>intentar acceder a cuentas ajenas, al panel de administración o a otras áreas restringidas;</li>
            <li>enviar cotizaciones o pedidos masivos, automatizados o con fines distintos a una compra real;</li>
            <li>interferir con el funcionamiento del sitio, sobrecargarlo o eludir sus medidas de seguridad;</li>
            <li>extraer el catálogo de forma automatizada o reproducirlo con fines comerciales;</li>
            <li>usar el sitio para fines ilícitos o que afecten derechos de terceros.</li>
          </UL>
        </>
      ),
    },
    {
      id: "responsabilidad",
      title: "Responsabilidad",
      content: (
        <>
          <P>
            El titular responde por los productos que comercializa y por la información que publica en
            los términos de la legislación vigente, incluida la de defensa del consumidor.
          </P>
          <P>
            En la medida en que la ley lo permite, el titular no responde por daños que resulten de la
            instalación incorrecta o el uso inadecuado de los productos, de datos erróneos aportados al
            pedir una cotización, de interrupciones del sitio ajenas a su control razonable, ni del
            contenido de sitios de terceros enlazados. Nada de lo anterior limita los derechos
            irrenunciables que la ley te reconoce como consumidor.
          </P>
          <P>
            Los aspectos técnicos de la disponibilidad del sitio se describen en la política de{" "}
            <A href={legalPath("desarrollo-y-mantenimiento")}>desarrollo y mantenimiento</A>.
          </P>
        </>
      ),
    },
    {
      id: "propiedad-intelectual",
      title: "Propiedad intelectual",
      content: (
        <P>
          Los contenidos del sitio están protegidos por la legislación de propiedad intelectual y de
          marcas. Lo que podés y no podés hacer con ellos se detalla en la{" "}
          <A href={legalPath("propiedad-intelectual")}>política de propiedad intelectual</A>.
        </P>
      ),
    },
    {
      id: "terceros",
      title: "Enlaces y servicios de terceros",
      content: (
        <P>
          El sitio incluye enlaces a WhatsApp y a las redes sociales del comercio. Al usarlos salís del
          sitio y quedás sujeto a los términos y la política de privacidad de cada servicio, sobre los
          que el titular no tiene control.
        </P>
      ),
    },
    {
      id: "suspension",
      title: "Suspensión o cancelación del acceso",
      content: (
        <P>
          El titular puede suspender o dar de baja una cuenta que incumpla estos términos, que se use
          de forma fraudulenta o que comprometa la seguridad del sitio. Si tu cuenta fue suspendida,
          podés consultar el motivo y aportar tu descargo por los medios de contacto indicados al
          final. Las operaciones ya confirmadas se rigen por lo acordado.
        </P>
      ),
    },
    {
      id: "modificaciones",
      title: "Modificaciones de estos términos",
      content: (
        <P>
          Estos términos pueden actualizarse para reflejar cambios en el sitio o en la normativa. La
          versión vigente es la publicada en esta página, con su fecha de actualización. Los cambios no
          afectan las cotizaciones ni los pedidos confirmados antes de su publicación.
        </P>
      ),
    },
    {
      id: "ley-aplicable",
      title: "Legislación aplicable y jurisdicción",
      content: (
        <P>
          Estos términos se rigen por las leyes de la República Argentina. Ante cualquier controversia
          son competentes los tribunales ordinarios de la ciudad de Mendoza, sin perjuicio del derecho
          que tenés como consumidor de acudir a los tribunales de tu domicilio y a las autoridades de
          defensa del consumidor que correspondan. Para reclamos, también podés escribirnos a{" "}
          <A href={`mailto:${contact.email}`}>{contact.email}</A>.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="terminos"
      intro={
        <p>
          Este documento explica qué podés hacer en el sitio de Crow Repuestos, cómo funcionan las
          cotizaciones y los pedidos, y qué responsabilidades tiene cada parte. Usar el sitio implica
          aceptar estas condiciones.
        </p>
      }
      sections={sections}
    />
  );
}
