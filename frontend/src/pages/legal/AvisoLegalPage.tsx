import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LegalDocument, P, UL, A, Dato, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

/**
 * Aviso legal: quién está detrás del sitio y qué responsabilidad asume por lo
 * que publica. A propósito no repite las reglas de uso (están en Términos) ni
 * el detalle de derechos sobre contenidos (Propiedad intelectual): remite.
 */
export function AvisoLegalPage() {
  const contact = useSiteSettings();

  const sections: LegalSection[] = [
    {
      id: "titular",
      title: "Identificación del titular",
      content: (
        <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-1 font-body text-body sm:grid-cols-[200px_1fr] sm:gap-y-3">
          {(
            [
              ["Razón social", <Dato campo="razonSocial" />],
              ["Nombre comercial", "Crow Repuestos"],
              ["CUIT", <Dato campo="cuit" />],
              ["Condición frente al IVA", <Dato campo="condicionIva" />],
              ["Domicilio legal", <Dato campo="domicilioLegal" />],
              ["Actividad", "Venta de repuestos, lubricantes, baterías y productos de detailing para vehículos"],
              ["Email", <A href={`mailto:${contact.email}`}>{contact.email}</A>],
              ["Teléfono", contact.phone_display],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="mt-3 text-body-sm text-textFaint sm:mt-0">{label}</dt>
              <dd className="m-0 text-ink900">{value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      id: "sitio",
      title: "Información general del sitio",
      content: (
        <P>
          Este sitio es el canal en línea de Crow Repuestos para mostrar su catálogo, recibir pedidos de
          cotización y gestionar pedidos de clientes registrados. La venta se concreta con la
          confirmación de un asesor; el sitio no procesa pagos.
        </P>
      ),
    },
    {
      id: "condiciones",
      title: "Condiciones de utilización",
      content: (
        <P>
          El acceso al sitio es libre y gratuito. Las condiciones para usar sus funciones (cuenta,
          cotizaciones, pedidos) están en los{" "}
          <A href={legalPath("terminos")}>términos y condiciones de uso</A>, y el tratamiento de datos
          personales en la <A href={legalPath("privacidad")}>política de privacidad</A>.
        </P>
      ),
    },
    {
      id: "propiedad-intelectual",
      title: "Propiedad intelectual",
      content: (
        <P>
          Los contenidos propios del sitio y la marca Crow Repuestos pertenecen al titular. Las marcas
          de los fabricantes y las imágenes de terceros pertenecen a sus respectivos dueños. El detalle
          está en la <A href={legalPath("propiedad-intelectual")}>política de propiedad intelectual</A>.
        </P>
      ),
    },
    {
      id: "contenidos",
      title: "Responsabilidad sobre los contenidos",
      content: (
        <>
          <P>
            El titular procura que la información publicada (descripciones, compatibilidades,
            precios de referencia y stock) sea correcta y esté actualizada, y corrige los errores que
            detecta o que se le informan. Aun así, puede haber diferencias entre lo publicado y la
            realidad del producto, en particular en:
          </P>
          <UL>
            <li>precios, que son de referencia hasta su confirmación en la cotización;</li>
            <li>stock, que puede variar entre la consulta y la operación;</li>
            <li>imágenes, que pueden ser ilustrativas y no reflejar cada variante del producto;</li>
            <li>compatibilidades, que conviene confirmar con un asesor indicando el vehículo exacto.</li>
          </UL>
          <P>
            Estas aclaraciones no limitan la obligación de brindar información veraz y detallada que
            establece la Ley 24.240 de Defensa del Consumidor. Si encontrás un error, avisanos por los
            medios de contacto.
          </P>
        </>
      ),
    },
    {
      id: "enlaces",
      title: "Enlaces externos",
      content: (
        <P>
          El sitio enlaza a WhatsApp y a las redes sociales del comercio. El titular no controla esos
          servicios ni responde por sus contenidos, su disponibilidad o sus políticas de privacidad. Un
          enlace no implica una relación con el sitio enlazado más allá de la indicada.
        </P>
      ),
    },
    {
      id: "limitaciones",
      title: "Exclusiones y limitaciones",
      content: (
        <P>
          El titular no responde por daños derivados de causas ajenas a su control razonable, como
          fallas de las redes de comunicación, de los proveedores de infraestructura o ataques
          informáticos que no pudieran evitarse con medidas de seguridad adecuadas. Estas limitaciones
          se aplican en la medida en que la ley lo permite y no afectan los derechos irrenunciables de
          los consumidores.
        </P>
      ),
    },
    {
      id: "ley-aplicable",
      title: "Legislación y jurisdicción",
      content: (
        <P>
          Este aviso se rige por las leyes de la República Argentina. Son competentes los tribunales
          ordinarios de la ciudad de Mendoza, sin perjuicio del derecho de los consumidores a acudir a
          los tribunales de su domicilio.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="aviso-legal"
      intro={
        <p>
          Quién es el titular de este sitio, cómo contactarlo y qué responsabilidad asume por los
          contenidos que publica y por los enlaces a otros sitios.
        </p>
      }
      sections={sections}
    />
  );
}
