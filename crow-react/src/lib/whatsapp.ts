/** Business contact details, kept in one place for easy editing. */
export const PHONE_DISPLAY = "+57 (300) 123-4567";
export const PHONE_TEL = "+573001234567";
export const EMAIL = "ventas@crowrepuestos.com";
export const WHATSAPP_NUMBER = "573001234567";
export const HOURS = "Lun–Sáb · 8:00–18:00";

/** Builds a wa.me link with an optional pre-filled, URL-encoded message. */
export function waLink(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
