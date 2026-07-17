import { useSettingsQuery } from "./queries";
import type { SiteSettings } from "./index";

/**
 * Valores reales del negocio, usados como fallback mientras `GET /settings`
 * todavía no resolvió (o si falla) -- así el sitio nunca muestra un estado
 * vacío/roto en el primer render. Coinciden con los defaults del backend
 * (`app/schemas/setting.py`); si cambian de verdad, el lugar para editarlos
 * es el panel admin (Configuración), no este archivo.
 */
const FALLBACK: SiteSettings = {
  company_name: "Crow Repuestos",
  phone_display: "261 660-0569",
  whatsapp_number: "5492616600569",
  email: "ventas@crowrepuestos.com.ar",
  address: "Mendoza, Argentina",
  hours: "Lun–Sáb · 8:00–18:00",
  instagram: "https://instagram.com/crowrepuestos",
  facebook: "https://facebook.com/crowrepuestos",
  tiktok: "",
};

/**
 * Datos de contacto/empresa en vivo, editables desde el panel admin
 * (Configuración) y usados en todo el sitio público (footer, navbar, hero,
 * checkout, páginas legales, etc.) -- hallazgo de "necesidad media" de la
 * auditoría del 2026-07-13: antes estaban hardcodeados en un archivo
 * estático (`shared/config/contact.ts`) y un cambio en el admin no se veía
 * reflejado en ningún lado.
 *
 * Siempre devuelve un `SiteSettings` completo (nunca `undefined`): mientras
 * `GET /settings` resuelve, o si la request falla, se usa `FALLBACK`.
 */
export function useSiteSettings(): SiteSettings {
  const { data } = useSettingsQuery();
  return data ?? FALLBACK;
}

/** Arma un link de wa.me con el número configurado (`whatsapp_number`) y un
 * mensaje pre-rellenado opcional. */
export function useWaLink(): (text?: string) => string {
  const { whatsapp_number } = useSiteSettings();
  return (text) => {
    const base = `https://wa.me/${whatsapp_number}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
  };
}
