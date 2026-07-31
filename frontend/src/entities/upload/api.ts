import { api } from "@/shared/api";

type CloudinarySignature = {
  cloud_name: string;
  api_key: string;
  timestamp: string;
  folder: string;
  signature: string;
};

/**
 * Direct browser -> Cloudinary upload.
 *
 * The image bytes never pass through our backend: we only ask it for a
 * short-lived signed request (admin only), then POST straight to
 * Cloudinary's REST API. The Cloudinary API secret never reaches the
 * browser -- only a one-time signature does.
 */
export const uploadApi = {
  uploadProductImage: async (file: File): Promise<string> => {
    const { data: sig } = await api.get<CloudinarySignature>("/uploads/cloudinary-signature");

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.api_key);
    form.append("timestamp", sig.timestamp);
    form.append("folder", sig.folder);
    form.append("signature", sig.signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      // Se propaga el motivo que devuelve Cloudinary en vez de un texto
      // genérico. Antes acá se tiraba "No se pudo subir la imagen" y se perdía
      // el único dato que explica el fallo: Cloudinary responde cosas muy
      // concretas -- "Invalid Signature", "Invalid api_key", "Unknown API key",
      // "File size too large" -- y cada una lleva a un arreglo distinto.
      // Sin eso, cualquier problema se ve igual desde afuera.
      let motivo = `${res.status} ${res.statusText}`;
      try {
        const err = await res.json();
        motivo = err?.error?.message ?? motivo;
      } catch {
        // Respuesta sin JSON: queda el código de estado, que ya es algo.
      }
      console.error("[upload] Cloudinary rechazó la subida:", motivo);
      throw new Error(`Cloudinary rechazó la imagen: ${motivo}`);
    }

    const json = await res.json();
    return json.secure_url as string;
  },
};
