import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";
import { contact } from "@/shared/config/contact";

export function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad" updated="1 de junio de 2026">
      <InfoBox>
        En Crow Repuestos respetamos tu privacidad. Esta política explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos.
      </InfoBox>

      <H2>1. Responsable del tratamiento</H2>
      <P>
        Crow Repuestos, con domicilio en Mendoza, Argentina. Podés contactarnos en cualquier momento a través de <strong>{contact.email}</strong> o por WhatsApp al <strong>{contact.phoneDisplay}</strong>.
      </P>

      <H2>2. Datos que recopilamos</H2>
      <P>Recopilamos únicamente los datos necesarios para brindarte nuestros servicios:</P>
      <UL>
        <li><strong>Datos de contacto:</strong> nombre, teléfono y correo electrónico que nos proporcionás al completar el formulario de cotización o al escribirnos por WhatsApp.</li>
        <li><strong>Datos de navegación:</strong> páginas visitadas, tiempo en el sitio y tipo de dispositivo, de forma anónima y agregada.</li>
        <li><strong>Datos de cuenta:</strong> si te registrás, almacenamos tu nombre, email y contraseña cifrada (bcrypt). Nunca almacenamos tu contraseña en texto plano.</li>
      </UL>

      <H2>3. Finalidad del tratamiento</H2>
      <UL>
        <li>Responder cotizaciones y consultas técnicas.</li>
        <li>Gestionar tu cuenta de usuario.</li>
        <li>Mejorar el funcionamiento del sitio web.</li>
        <li>Cumplir con obligaciones legales aplicables en Argentina.</li>
      </UL>

      <Divider />

      <H2>4. Base legal</H2>
      <P>
        El tratamiento de tus datos se realiza en base a tu consentimiento explícito (formulario de cotización), la ejecución de la relación comercial y el cumplimiento de obligaciones legales bajo la <strong>Ley 25.326 de Protección de Datos Personales</strong> de la República Argentina.
      </P>

      <H2>5. Conservación de los datos</H2>
      <P>
        Conservamos tus datos mientras mantengamos una relación comercial activa o hasta que solicitéses su eliminación, y en todo caso no más de 5 años desde el último contacto, salvo obligación legal que requiera un plazo mayor.
      </P>

      <H2>6. Compartir información con terceros</H2>
      <P>
        No vendemos, alquilamos ni compartimos tus datos personales con terceros con fines comerciales. Podemos compartir información únicamente con:
      </P>
      <UL>
        <li>Proveedores tecnológicos que hospedan nuestra infraestructura (bajo acuerdos de confidencialidad).</li>
        <li>Autoridades competentes cuando la ley lo requiera.</li>
      </UL>

      <H2>7. Tus derechos</H2>
      <P>Conforme a la Ley 25.326 tenés derecho a:</P>
      <UL>
        <li><strong>Acceso:</strong> conocer qué datos tenemos sobre vos.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
        <li><strong>Supresión:</strong> solicitar la eliminación de tus datos.</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento para determinadas finalidades.</li>
      </UL>
      <P>Para ejercer estos derechos escribinos a <strong>{contact.email}</strong>.</P>

      <H2>8. Seguridad</H2>
      <P>
        Implementamos medidas técnicas y organizativas para proteger tus datos: cifrado HTTPS, contraseñas hasheadas con bcrypt, tokens JWT de corta duración y acceso restringido a la base de datos.
      </P>

      <H2>9. Cambios a esta política</H2>
      <P>
        Podemos actualizar esta política ocasionalmente. Te notificaremos los cambios relevantes publicando la nueva versión en esta misma página con la fecha de actualización.
      </P>
    </LegalLayout>
  );
}
