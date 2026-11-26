import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LegalDocument, P, UL, A, type LegalSection } from "./LegalLayout";

// La versión anterior afirmaba que "todos los textos cumplen WCAG AA" y
// prometía responder en 5 días hábiles. Ninguna de las dos cosas estaba
// medida ni acordada. Queda lo que se puede sostener.
export function AccesibilidadPage() {
  const contact = useSiteSettings();

  const sections: LegalSection[] = [
    {
      id: "objetivo",
      title: "Objetivo",
      content: (
        <P>
          Crow Repuestos busca que su sitio pueda usarse con cualquier capacidad y desde cualquier
          dispositivo, tomando como referencia las pautas WCAG 2.1 nivel AA del W3C. Este documento
          informa el estado actual, no una certificación.
        </P>
      ),
    },
    {
      id: "estado",
      title: "Qué se tuvo en cuenta",
      content: (
        <UL>
          <li>Contraste de los textos revisado contra los mínimos de WCAG AA en las páginas públicas.</li>
          <li>Controles operables con teclado y con indicador de foco visible.</li>
          <li>Estructura con encabezados, regiones (cabecera, navegación, contenido, pie) y listas.</li>
          <li>Campos de formulario con etiqueta asociada.</li>
          <li>Diálogos que se cierran con la tecla Escape.</li>
          <li>Sin animaciones de entrada para quien activó «reducir movimiento» en su sistema.</li>
          <li>Diseño que se adapta a pantallas chicas y al zoom del navegador.</li>
        </UL>
      ),
    },
    {
      id: "limitaciones",
      title: "Limitaciones conocidas",
      content: (
        <UL>
          <li>No hay un enlace para saltar directo al contenido principal.</li>
          <li>Algunos mensajes de error de formularios no se anuncian automáticamente a los lectores de pantalla.</li>
          <li>El panel de administración no tuvo todavía una revisión de accesibilidad completa.</li>
          <li>No se hicieron pruebas sistemáticas con lectores de pantalla.</li>
        </UL>
      ),
    },
    {
      id: "reportar",
      title: "Cómo reportar una barrera",
      content: (
        <P>
          Si algo del sitio no te resulta accesible, escribinos a{" "}
          <A href={`mailto:${contact.email}`}>{contact.email}</A> o por WhatsApp al{" "}
          {contact.phone_display}, contando en qué página y con qué dispositivo o tecnología de apoyo.
          Mientras lo resolvemos, podemos atender tu consulta o tu pedido por esos mismos medios.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="accesibilidad"
      intro={<p>Qué hace el sitio para ser accesible, qué falta todavía y cómo avisarnos si encontrás una barrera.</p>}
      sections={sections}
    />
  );
}
