import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LegalDocument, P, UL, A, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

export function PropiedadIntelectualPage() {
  const contact = useSiteSettings();

  const sections: LegalSection[] = [
    {
      id: "titularidad",
      title: "Titularidad de los contenidos",
      content: (
        <>
          <P>
            Son del titular del sitio, o se usan con su autorización, los textos propios (descripciones
            institucionales, preguntas frecuentes, estos documentos), el diseño de la interfaz y la
            organización del catálogo. Están protegidos por la Ley 11.723 de Propiedad Intelectual.
          </P>
          <P>No son del titular, y se usan para identificar los productos que se comercializan:</P>
          <UL>
            <li>las marcas, logos y nombres de los fabricantes y de los vehículos mencionados;</li>
            <li>las fotografías e imágenes de producto provistas por fabricantes o distribuidores, cuando las hay;</li>
            <li>el software de código abierto y las tipografías detallados en <A href={legalPath("licencias")}>licencias de software</A>.</li>
          </UL>
        </>
      ),
    },
    {
      id: "imagenes",
      title: "Textos, imágenes y recursos gráficos",
      content: (
        <P>
          Las imágenes de producto tienen fines ilustrativos e identificatorios. Cuando un producto no
          tiene foto, el sitio muestra un ícono genérico de su categoría con la leyenda «sin imagen».
          La iconografía del sitio está dibujada en SVG dentro del propio código.
        </P>
      ),
    },
    {
      id: "software",
      title: "Software y componentes tecnológicos",
      content: (
        <P>
          El código propio de la plataforma no se distribuye bajo licencia abierta. Está construido sobre
          componentes de código abierto que se usan según sus licencias (MIT, Apache 2.0, BSD, OFL y
          otras), que conservan los derechos de sus autores. El listado está en{" "}
          <A href={legalPath("licencias")}>licencias de software</A>.
        </P>
      ),
    },
    {
      id: "marcas",
      title: "Marcas y signos distintivos",
      content: (
        <P>
          «Crow Repuestos» y su logotipo identifican al comercio. Las marcas de terceros que aparecen en
          el catálogo se mencionan solo para indicar el origen o la compatibilidad de un producto, uso
          que no implica patrocinio ni relación comercial con su titular más allá de la distribución de
          sus productos. La protección de las marcas se rige por la Ley 22.362.
        </P>
      ),
    },
    {
      id: "usos",
      title: "Usos permitidos y restricciones",
      content: (
        <>
          <P>Podés, sin pedir autorización:</P>
          <UL>
            <li>consultar el sitio y compartir enlaces a sus páginas;</li>
            <li>guardar o imprimir fichas de producto, cotizaciones y pedidos para tu uso personal.</li>
          </UL>
          <P>Requiere autorización escrita previa:</P>
          <UL>
            <li>reproducir, distribuir o publicar los contenidos propios del sitio con fines comerciales;</li>
            <li>extraer el catálogo de forma automatizada o volcarlo en otra base de datos;</li>
            <li>usar la marca o el logotipo de Crow Repuestos.</li>
          </UL>
          <P>
            Estas restricciones no alcanzan los usos que la ley permite sin autorización, como la cita
            con fines de crítica o información.
          </P>
        </>
      ),
    },
    {
      id: "reclamos",
      title: "Reclamos sobre derechos",
      content: (
        <P>
          Si considerás que un contenido del sitio infringe un derecho tuyo de propiedad intelectual o
          de marca, escribí a <A href={`mailto:${contact.email}`}>{contact.email}</A> identificando el
          contenido (con su enlace), el derecho que invocás y tus datos de contacto. El titular revisa
          cada reclamo y, si corresponde, retira o corrige el contenido.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="propiedad-intelectual"
      intro={
        <p>
          Qué contenidos del sitio pertenecen a Crow Repuestos, cuáles pertenecen a terceros, qué podés
          hacer con ellos y cómo reclamar si algo infringe tus derechos.
        </p>
      }
      sections={sections}
    />
  );
}
