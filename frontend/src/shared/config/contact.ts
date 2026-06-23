/** Centralized business contact details. */
export const contact = {
  phoneDisplay: "261 660-0569",
  phoneTel: "+5492616600569",
  email: "ventas@crowrepuestos.com.ar",
  whatsappNumber: "5492616600569",
  hours: "Lun–Sáb · 8:00–18:00",
  city: "Mendoza, Argentina",
  social: {
    instagram: "https://instagram.com/crowrepuestos",
    facebook: "https://facebook.com/crowrepuestos",
  },
} as const;

/** Builds a wa.me link with an optional pre-filled, URL-encoded message. */
export function waLink(text?: string): string {
  const base = `https://wa.me/${contact.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
