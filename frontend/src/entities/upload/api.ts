import { api } from "@/shared/api/client";

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
      throw new Error("No se pudo subir la imagen a Cloudinary");
    }
    const json = await res.json();
    return json.secure_url as string;
  },
};
