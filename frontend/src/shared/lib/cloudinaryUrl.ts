/**
 * Inserta una transformación de Cloudinary en una URL de imagen ya subida,
 * si (y solo si) esa URL es realmente de Cloudinary -- hallazgo "Alta" #18
 * de la auditoría técnica del 2026-07-13. Antes las imágenes de producto se
 * servían tal cual las devolvía el upload original (tamaño completo,
 * cualquiera sea el peso real del archivo que subió el admin), sin importar
 * que se estén mostrando en una miniatura de 44px.
 *
 * Cloudinary aplica transformaciones insertando un segmento entre
 * `/upload/` y el resto del path, ej:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/carpeta/foto.jpg
 *   → https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_fill,w_400/v123/carpeta/foto.jpg
 *
 * `f_auto` y `q_auto` son las dos transformaciones de mayor impacto y menor
 * riesgo: Cloudinary elige el formato más liviano que el browser soporte
 * (AVIF/WebP en vez de JPEG cuando aplica) y ajusta la calidad de
 * compresión automáticamente -- ninguna de las dos cambia el contenido
 * visual de la imagen, solo cómo se codifica.
 *
 * URLs que no son de Cloudinary (un admin puede pegar cualquier URL externa
 * como logo de marca, no solo lo que sube el uploader propio) se devuelven
 * intactas -- no hay forma de aplicarles esta transformación, y no tiene
 * sentido romper la URL intentándolo.
 */
export function cloudinaryTransform(
  url: string,
  { width, height }: { width?: number; height?: number } = {}
): string {
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1 || !url.includes("res.cloudinary.com")) return url;

  const parts = ["f_auto", "q_auto"];
  if (width && height) parts.push("c_fill", `w_${width}`, `h_${height}`);
  else if (width) parts.push("c_limit", `w_${width}`);
  else if (height) parts.push("c_limit", `h_${height}`);

  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);
  return `${before}${parts.join(",")}/${after}`;
}
