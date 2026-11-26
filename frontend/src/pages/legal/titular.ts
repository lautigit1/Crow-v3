/**
 * Datos del titular que los documentos legales necesitan y que el proyecto
 * todavía no tiene. Ninguno se inventó: mientras valgan `null`, la página
 * muestra un marcador visible ("[CUIT: a completar]") en lugar del dato.
 *
 * Completarlos acá actualiza todos los documentos a la vez. Lo que sí existe
 * (email, teléfono, horario, ciudad) sale de la configuración del panel vía
 * `useSiteSettings`, igual que en el resto del sitio.
 */
export const TITULAR: Record<TitularCampo, string | null> = {
  razonSocial: null,
  cuit: null,
  domicilioLegal: null,
  condicionIva: null,
  /** N.º de inscripción de las bases de datos en el Registro Nacional de Bases de Datos (AAIP). */
  registroBasesDeDatos: null,
  /** Empresa que provee el servidor donde corre la plataforma. */
  proveedorHosting: null,
  /** Proveedor del servidor de correo saliente (SMTP). */
  proveedorCorreo: null,
  /** Plazo de conservación de los registros de auditoría con IP. */
  plazoRegistrosAcceso: null,
};

export type TitularCampo =
  | "razonSocial"
  | "cuit"
  | "domicilioLegal"
  | "condicionIva"
  | "registroBasesDeDatos"
  | "proveedorHosting"
  | "proveedorCorreo"
  | "plazoRegistrosAcceso";

export const ETIQUETA_CAMPO: Record<TitularCampo, string> = {
  razonSocial: "Razón social",
  cuit: "CUIT",
  domicilioLegal: "Domicilio legal",
  condicionIva: "Condición frente al IVA",
  registroBasesDeDatos: "N.º de inscripción en el Registro Nacional de Bases de Datos",
  proveedorHosting: "Proveedor de hosting",
  proveedorCorreo: "Proveedor de correo saliente",
  plazoRegistrosAcceso: "Plazo de conservación de registros de acceso",
};

/**
 * Mientras sea `true`, cada documento muestra un aviso discreto de que el
 * texto es una versión preliminar pendiente de revisión profesional. Pasarlo
 * a `false` cuando un abogado lo haya revisado y los datos estén completos.
 */
export const LEGAL_BORRADOR = true;
