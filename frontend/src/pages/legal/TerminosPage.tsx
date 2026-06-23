import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";
import { contact } from "@/shared/config/contact";

export function TerminosPage() {
  return (
    <LegalLayout title="Términos y condiciones" updated="1 de junio de 2026">
      <InfoBox>
        Al acceder y utilizar el sitio web de Crow Repuestos aceptás estos términos y condiciones en su totalidad. Si no estás de acuerdo, te pedimos que no utilices el sitio.
      </InfoBox>

      <H2>1. Identificación</H2>
      <P>
        Crow Repuestos es una distribuidora automotriz con sede en Mendoza, Argentina. Podés contactarnos en <strong>{contact.email}</strong> o por WhatsApp al <strong>{contact.phoneDisplay}</strong>.
      </P>

      <H2>2. Objeto del sitio</H2>
      <P>
        El sitio web tiene como finalidad brindar información sobre nuestros productos y servicios, y facilitar el contacto para solicitar cotizaciones de repuestos, lubricantes, baterías y productos de detailing automotriz.
      </P>

      <H2>3. Uso aceptable</H2>
      <P>Al utilizar este sitio te comprometés a:</P>
      <UL>
        <li>No utilizar el sitio para fines ilegales o no autorizados.</li>
        <li>No intentar acceder a áreas restringidas sin autorización.</li>
        <li>No enviar información falsa o engañosa en los formularios.</li>
        <li>No interferir con el funcionamiento normal del sitio ni de sus servidores.</li>
      </UL>

      <Divider />

      <H2>4. Precios y disponibilidad</H2>
      <P>
        Los precios indicados en el catálogo son de referencia y pueden variar sin previo aviso debido a fluctuaciones del mercado. El precio definitivo se confirma al momento de la cotización. La disponibilidad de stock se informa en tiempo real durante la consulta.
      </P>

      <H2>5. Proceso de compra</H2>
      <P>
        Crow Repuestos opera principalmente mediante cotización previa. El proceso es:
      </P>
      <UL>
        <li>El cliente solicita una cotización (formulario o WhatsApp).</li>
        <li>Un asesor confirma disponibilidad y precio final.</li>
        <li>Se acuerda forma de pago y modalidad de entrega.</li>
        <li>La venta queda confirmada con el pago efectivo.</li>
      </UL>

      <H2>6. Garantías</H2>
      <P>
        Todos los productos comercializados cuentan con garantía de fábrica del fabricante o distribuidor oficial. Los plazos y condiciones de garantía varían según el producto y se informan al momento de la venta. Crow Repuestos actúa como intermediario en la gestión de garantías.
      </P>

      <H2>7. Responsabilidad</H2>
      <P>
        Crow Repuestos no se hace responsable por daños derivados de la instalación incorrecta de los productos, uso inadecuado, o por información incorrecta provista por el cliente al realizar la consulta (modelo de vehículo, año, versión, etc.).
      </P>

      <H2>8. Propiedad intelectual</H2>
      <P>
        El contenido del sitio (textos, imágenes, logotipos, diseño) es propiedad de Crow Repuestos o de sus licenciantes. Queda prohibida su reproducción total o parcial sin autorización escrita previa.
      </P>

      <H2>9. Ley aplicable</H2>
      <P>
        Estos términos se rigen por la legislación argentina. Cualquier controversia se someterá a la jurisdicción de los tribunales ordinarios de la ciudad de Mendoza, Argentina.
      </P>

      <H2>10. Modificaciones</H2>
      <P>
        Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entran en vigencia desde su publicación en esta página.
      </P>
    </LegalLayout>
  );
}
