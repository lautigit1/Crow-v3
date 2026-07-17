import { describe, it, expect } from "vitest";
import { cloudinaryTransform } from "@/shared/lib/cloudinaryUrl";

const CLOUDINARY_URL = "https://res.cloudinary.com/crow-demo/image/upload/v1700000000/productos/filtro.jpg";

describe("cloudinaryTransform", () => {
  it("inserta f_auto,q_auto,c_limit,w_<n> con solo width", () => {
    expect(cloudinaryTransform(CLOUDINARY_URL, { width: 400 })).toBe(
      "https://res.cloudinary.com/crow-demo/image/upload/f_auto,q_auto,c_limit,w_400/v1700000000/productos/filtro.jpg"
    );
  });

  it("inserta f_auto,q_auto,c_fill,w_<n>,h_<n> con width y height", () => {
    expect(cloudinaryTransform(CLOUDINARY_URL, { width: 400, height: 300 })).toBe(
      "https://res.cloudinary.com/crow-demo/image/upload/f_auto,q_auto,c_fill,w_400,h_300/v1700000000/productos/filtro.jpg"
    );
  });

  it("inserta f_auto,q_auto,c_limit,h_<n> con solo height", () => {
    expect(cloudinaryTransform(CLOUDINARY_URL, { height: 200 })).toBe(
      "https://res.cloudinary.com/crow-demo/image/upload/f_auto,q_auto,c_limit,h_200/v1700000000/productos/filtro.jpg"
    );
  });

  it("solo agrega f_auto,q_auto sin width ni height", () => {
    expect(cloudinaryTransform(CLOUDINARY_URL)).toBe(
      "https://res.cloudinary.com/crow-demo/image/upload/f_auto,q_auto/v1700000000/productos/filtro.jpg"
    );
  });

  it("devuelve URLs que no son de Cloudinary intactas", () => {
    const external = "https://ejemplo.com/logos/marca.png";
    expect(cloudinaryTransform(external, { width: 400 })).toBe(external);
  });

  it("devuelve intacta una URL de res.cloudinary.com sin /image/upload/ (ej. raw/video)", () => {
    const raw = "https://res.cloudinary.com/crow-demo/raw/upload/v1700000000/archivo.pdf";
    expect(cloudinaryTransform(raw, { width: 400 })).toBe(raw);
  });

  it("maneja string vacío sin explotar", () => {
    expect(cloudinaryTransform("", { width: 400 })).toBe("");
  });
});
