import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LegalDocument, P, UL, H3, A, Dato, Nota, Tabla, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

// El monitoreo de errores del navegador solo existe si el build se hizo con
// VITE_SENTRY_DSN (ver shared/lib/sentry.ts). La política lo menciona solo en
// ese caso: describir un servicio que no está activo sería tan inexacto como
// omitir uno que sí lo está.
const SENTRY_ACTIVO = Boolean(import.meta.env.VITE_SENTRY_DSN);

export function PrivacidadPage() {
  const contact = useSiteSettings();

  const terceros: [string, string, string][] = [
    ["Proveedor de hosting", "Aloja el servidor y la base de datos donde se guarda toda la información del sitio.", "proveedorHosting"],
    ["Proveedor de correo saliente", "Envía los emails del sitio: bienvenida, recuperación de contraseña, avisos de pedidos y cotizaciones.", "proveedorCorreo"],
  ];

  const sections: LegalSection[] = [
    {
      id: "responsable",
      title: "Responsable del tratamiento",
      content: (
        <>
          <P>
            El responsable de las bases de datos y del tratamiento de los datos personales que se
            recopilan en este sitio es <Dato campo="razonSocial" />, CUIT <Dato campo="cuit" />, con
            domicilio en <Dato campo="domicilioLegal" />, que opera bajo el nombre comercial Crow
            Repuestos.
          </P>
          <P>
            Inscripción en el Registro Nacional de Bases de Datos: <Dato campo="registroBasesDeDatos" />.
          </P>
        </>
      ),
    },
    {
      id: "datos",
      title: "Qué datos recopilamos",
      content: (
        <>
          <P>Solo recopilamos los datos que se necesitan para cada función del sitio:</P>
          <H3>Si creás una cuenta</H3>
          <UL>
            <li>Nombre completo, email y teléfono.</li>
            <li>Tu contraseña, guardada únicamente en forma cifrada (hash bcrypt). Nadie, tampoco el comercio, puede leerla.</li>
            <li>Fecha de alta y del último ingreso.</li>
            <li>Los productos que marcás como favoritos y las notificaciones que el sitio te envía.</li>
          </UL>
          <H3>Si pedís una cotización</H3>
          <UL>
            <li>Nombre, email (opcional), el vehículo y el detalle de lo que necesitás.</li>
            <li>El producto desde el que hiciste la consulta, si la iniciaste desde una ficha.</li>
            <li>Si tenés la sesión iniciada, la cotización queda asociada a tu cuenta.</li>
          </UL>
          <H3>Si enviás un pedido</H3>
          <UL>
            <li>Los productos y cantidades, la forma de pago que elegiste y las notas que agregues.</li>
            <li>El sitio no recibe ni guarda datos de tarjetas ni de cuentas bancarias: el pago se coordina por fuera del sitio.</li>
          </UL>
          <H3>Registros de seguridad</H3>
          <UL>
            <li>
              La dirección IP y el email asociados a eventos de seguridad, como inicios de sesión
              exitosos o fallidos, y a las acciones realizadas desde el panel de administración.
            </li>
            <li>La dirección IP, en forma temporal, para limitar intentos repetidos de inicio de sesión, registro, recuperación de contraseña y envío de cotizaciones.</li>
          </UL>
          <H3>Lo que no recopilamos</H3>
          <P>
            El sitio no usa herramientas de analítica, publicidad ni seguimiento de terceros, y no arma
            perfiles de navegación.
          </P>
        </>
      ),
    },
    {
      id: "finalidad",
      title: "Para qué los usamos",
      content: (
        <UL>
          <li>Responder tus cotizaciones y consultas técnicas.</li>
          <li>Gestionar tu cuenta, tus pedidos y avisarte de sus cambios de estado.</li>
          <li>Enviarte los emails del servicio: bienvenida, recuperación de contraseña, respuesta a cotizaciones y novedades de pedidos.</li>
          <li>Proteger el sitio y las cuentas frente a accesos indebidos y abusos.</li>
          <li>Cumplir obligaciones legales, por ejemplo las contables y fiscales vinculadas a una venta.</li>
        </UL>
      ),
    },
    {
      id: "base-legal",
      title: "Base legal del tratamiento",
      content: (
        <>
          <P>
            Tratamos tus datos conforme a la Ley 25.326 de Protección de Datos Personales, su decreto
            reglamentario 1558/2001 y las normas complementarias. Según la función de que se trate, el
            tratamiento se basa en:
          </P>
          <UL>
            <li>tu consentimiento, que prestás al registrarte o al enviar una cotización;</li>
            <li>la necesidad de los datos para responder tu solicitud o cumplir una operación comercial que vos iniciaste;</li>
            <li>el cumplimiento de obligaciones legales del titular.</li>
          </UL>
          <P>Podés retirar tu consentimiento en cualquier momento, sin efecto retroactivo, por los medios del apartado de contacto.</P>
        </>
      ),
    },
    {
      id: "recopilacion",
      title: "Cómo se recopilan",
      content: (
        <P>
          Los datos los ingresás vos en los formularios de registro, cotización, pedido y perfil. Los
          registros de seguridad se generan automáticamente cuando usás esas funciones. Si nos escribís
          por WhatsApp o por email, recibimos la información que incluyas en el mensaje.
        </P>
      ),
    },
    {
      id: "almacenamiento",
      title: "Almacenamiento y conservación",
      content: (
        <>
          <P>
            Los datos se guardan en la base de datos del sitio, alojada por el proveedor de hosting
            indicado más abajo. El carrito de un visitante sin cuenta queda solo en su navegador (ver
            la <A href={legalPath("cookies")}>política de cookies</A>).
          </P>
          <UL>
            <li>Datos de cuenta: mientras la cuenta esté activa y hasta que pidas su baja.</li>
            <li>Cotizaciones y pedidos: el tiempo necesario para atender la operación y cumplir las obligaciones legales que la alcancen.</li>
            <li>Registros de seguridad: <Dato campo="plazoRegistrosAcceso" />.</li>
          </UL>
          <P>
            Vencidos esos plazos, los datos se eliminan o se conservan en forma que no permita
            identificarte. Los datos eliminados pueden permanecer en las copias de seguridad de la base
            de datos hasta que esas copias se renueven.
          </P>
        </>
      ),
    },
    {
      id: "terceros",
      title: "Proveedores y terceros",
      content: (
        <>
          <P>
            No vendemos tus datos ni los cedemos a terceros para que los usen con fines propios. Para
            que el sitio funcione intervienen los siguientes proveedores, que tratan datos solo por
            cuenta del titular:
          </P>
          <Tabla
            head={["Proveedor", "Para qué interviene"]}
            rows={[
              ...terceros.map(([nombre, para, campo]) => [
                <>
                  {nombre}: <Dato campo={campo as "proveedorHosting" | "proveedorCorreo"} />
                </>,
                para,
              ]),
              [
                "Cloudinary",
                "Aloja y sirve las imágenes de los productos. Recibe los datos técnicos que tu navegador envía al cargar una imagen (como la dirección IP), no tus datos de cuenta.",
              ],
              ...(SENTRY_ACTIVO
                ? [[
                    "Sentry",
                    "Recibe informes técnicos cuando ocurre un error en el sitio (tipo de error, página y navegador), configurado para no enviar datos personales identificatorios.",
                  ]]
                : []),
            ]}
          />
          <P>
            Si elegís escribirnos por WhatsApp, esa conversación se rige además por las condiciones y
            la política de privacidad de WhatsApp. También podemos comunicar datos a autoridades
            judiciales o administrativas cuando una norma lo exija.
          </P>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "Transferencias internacionales",
      content: (
        <P>
          Algunos de los proveedores mencionados pueden procesar información en servidores ubicados
          fuera de la Argentina. En esos casos, la transferencia se realiza en las condiciones que
          establece el artículo 12 de la Ley 25.326 y su reglamentación. Si querés saber en qué país
          se procesa algún dato en particular, podés consultarnos.
        </P>
      ),
    },
    {
      id: "seguridad",
      title: "Medidas de seguridad",
      content: (
        <UL>
          <li>Conexión cifrada (HTTPS) en todo el sitio.</li>
          <li>Contraseñas guardadas solo como hash bcrypt.</li>
          <li>Sesión mediante cookies HttpOnly, que el código del navegador no puede leer, con vencimiento corto y renovación de un solo uso.</li>
          <li>Límites de intentos para inicio de sesión, registro, recuperación de contraseña y cotizaciones.</li>
          <li>Acceso al panel de administración restringido por rol y registro de las acciones que se realizan en él.</li>
        </UL>
      ),
    },
    {
      id: "derechos",
      title: "Tus derechos",
      content: (
        <>
          <P>Como titular de los datos tenés derecho a:</P>
          <UL>
            <li><strong className="font-medium text-ink900">Acceso:</strong> saber qué datos tuyos tenemos y cómo los obtuvimos.</li>
            <li><strong className="font-medium text-ink900">Rectificación y actualización:</strong> corregir datos inexactos o incompletos.</li>
            <li><strong className="font-medium text-ink900">Supresión:</strong> pedir que eliminemos tus datos, salvo que debamos conservarlos por obligación legal.</li>
            <li><strong className="font-medium text-ink900">Retiro del consentimiento</strong> para los tratamientos que se basan en él.</li>
          </UL>
          <Nota>
            El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los
            mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un
            interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley
            N.º 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de
            Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que
            interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas
            vigentes en materia de protección de datos personales.
          </Nota>
        </>
      ),
    },
    {
      id: "ejercicio",
      title: "Cómo ejercer tus derechos",
      content: (
        <>
          <P>
            Escribinos a <A href={`mailto:${contact.email}`}>{contact.email}</A> indicando qué derecho
            querés ejercer y el email con el que te registraste o con el que pediste la cotización.
            Para proteger tus datos, podemos pedirte que acredites tu identidad antes de responder.
          </P>
          <P>
            La ley fija plazos para responder: diez días corridos para un pedido de acceso y cinco días
            hábiles para uno de rectificación, actualización o supresión, contados desde que lo
            recibimos. Si no obtenés respuesta en esos plazos, o no te conforma, podés recurrir a la{" "}
            <A href="https://www.argentina.gob.ar/aaip">Agencia de Acceso a la Información Pública</A>.
          </P>
          <H3>Modificar o eliminar tu cuenta</H3>
          <P>
            Nombre, teléfono y contraseña los podés cambiar vos mismo desde «Mi cuenta». El email no
            se puede modificar desde el sitio: si necesitás corregirlo, pedilo por los medios de
            contacto. La baja de la cuenta también se pide por esos medios: eliminamos los datos de la
            cuenta y conservamos solo lo que una obligación legal nos exija sobre las operaciones
            realizadas.
          </P>
        </>
      ),
    },
    {
      id: "cambios",
      title: "Cambios en esta política",
      content: (
        <P>
          Si cambia la forma en que tratamos los datos, actualizamos esta página y su fecha de
          actualización. Un cambio no habilita a usar los datos ya recopilados para una finalidad
          distinta de la informada cuando los diste, salvo que prestes un nuevo consentimiento.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="privacidad"
      intro={
        <p>
          Esta política explica qué datos personales recopila el sitio de Crow Repuestos, para qué se
          usan, con quién se comparten y cómo podés acceder a ellos, corregirlos o pedir que se
          eliminen.
        </p>
      }
      sections={sections}
    />
  );
}
