/**
 * Registro único de los documentos legales: ruta, título, descripción para
 * buscadores y fecha de la versión vigente. Lo leen el layout (encabezado,
 * metadatos, documentos relacionados), el footer y el router, así que una
 * ruta nueva o un título cambiado se tocan en un solo lugar.
 */
export type LegalDocKey =
  | "terminos"
  | "privacidad"
  | "cookies"
  | "aviso-legal"
  | "propiedad-intelectual"
  | "desarrollo-y-mantenimiento"
  | "licencias"
  | "accesibilidad";

export type LegalDoc = {
  key: LegalDocKey;
  path: string;
  title: string;
  /** Texto del enlace en el footer y en "Otros documentos". */
  short: string;
  /** Meta description y bajada del encabezado. */
  description: string;
  updated: string;
  /** Aparece en la columna "Legales" del footer. */
  inFooter: boolean;
};

export const LEGAL_DOCS: LegalDoc[] = [
  {
    key: "terminos",
    path: "/legal/terminos",
    title: "Términos y condiciones de uso",
    short: "Términos y condiciones",
    description:
      "Condiciones para usar el sitio de Crow Repuestos: cuentas, cotizaciones, pedidos, precios de referencia, responsabilidades y jurisdicción.",
    updated: "24 de noviembre de 2026",
    inFooter: true,
  },
  {
    key: "privacidad",
    path: "/legal/privacidad",
    title: "Política de privacidad y protección de datos",
    short: "Política de privacidad",
    description:
      "Qué datos personales recopila Crow Repuestos, para qué los usa, con quién los comparte y cómo ejercer tus derechos según la Ley 25.326.",
    updated: "24 de noviembre de 2026",
    inFooter: true,
  },
  {
    key: "cookies",
    path: "/legal/cookies",
    title: "Política de cookies",
    short: "Política de cookies",
    description:
      "Las cookies y el almacenamiento local que usa el sitio de Crow Repuestos, para qué sirven, cuánto duran y cómo eliminarlos.",
    updated: "24 de noviembre de 2026",
    inFooter: true,
  },
  {
    key: "aviso-legal",
    path: "/legal/aviso-legal",
    title: "Aviso legal",
    short: "Aviso legal",
    description:
      "Identificación del titular del sitio de Crow Repuestos, responsabilidad sobre los contenidos y los enlaces externos, y legislación aplicable.",
    updated: "24 de noviembre de 2026",
    inFooter: true,
  },
  {
    key: "propiedad-intelectual",
    path: "/legal/propiedad-intelectual",
    title: "Política de propiedad intelectual",
    short: "Propiedad intelectual",
    description:
      "Titularidad de los textos, imágenes, marcas y software del sitio de Crow Repuestos, usos permitidos y cómo hacer un reclamo de derechos.",
    updated: "24 de noviembre de 2026",
    inFooter: true,
  },
  {
    key: "desarrollo-y-mantenimiento",
    path: "/legal/desarrollo-y-mantenimiento",
    title: "Desarrollo, mantenimiento y actualizaciones",
    short: "Desarrollo y mantenimiento",
    description:
      "Cómo se mantiene y actualiza la plataforma de Crow Repuestos, de qué servicios externos depende, sus limitaciones técnicas y cómo reportar un problema.",
    updated: "24 de noviembre de 2026",
    inFooter: true,
  },
  {
    key: "licencias",
    path: "/legal/licencias",
    title: "Licencias de software",
    short: "Licencias de software",
    description:
      "Software de código abierto y tipografías de terceros con los que está construido el sitio de Crow Repuestos, con sus licencias.",
    updated: "24 de noviembre de 2026",
    inFooter: false,
  },
  {
    key: "accesibilidad",
    path: "/legal/accesibilidad",
    title: "Declaración de accesibilidad",
    short: "Accesibilidad",
    description:
      "Estado de accesibilidad del sitio de Crow Repuestos, limitaciones conocidas y cómo reportar una barrera.",
    updated: "24 de noviembre de 2026",
    inFooter: false,
  },
];

export function legalDoc(key: LegalDocKey): LegalDoc {
  const doc = LEGAL_DOCS.find((d) => d.key === key);
  if (!doc) throw new Error(`Documento legal desconocido: ${key}`);
  return doc;
}

export const legalPath = (key: LegalDocKey) => legalDoc(key).path;
