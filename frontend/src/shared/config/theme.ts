/**
 * Design tokens for Crow Repuestos.
 *
 * `color` es la única fuente real de la paleta: tailwind.config.ts la
 * importa directo (ver comentario ahí) para generar las clases `bg-primary`,
 * `text-danger`, etc., y un puñado de componentes siguen importándola acá
 * para casos que una clase estática de Tailwind no puede cubrir --
 * colores calculados en runtime (hue por hash de nombre, transparencia
 * `${color}18`) o valores por default de props dinámicas (`stroke` de
 * Spinner, `accent` de AccountMenu). `font`/`radius`/`shadow`/`layout` ya
 * no tienen consumidores en JS (el último, AccountMenu.tsx, se migró a
 * clases Tailwind) -- quedan acá documentados por si hace falta un valor
 * puntual en runtime más adelante, pero tailwind.config.ts define los suyos
 * de forma independiente.
 */
export const color = {
  // Brand
  primary: "#0057D9",
  primaryDark: "#0047B3",
  primarySoft: "#E8F0FE",

  // Industrial navies
  ink900: "#07111F",
  ink800: "#0D1728",
  ink700: "#1E293B",

  // Neutrals
  white: "#FFFFFF",
  surface: "#F8FAFC",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  // Text
  text: "#0D1728",
  textMuted: "#475569",
  textFaint: "#64748B",
  textOnDark: "#E2E8F0",
  textOnDarkFaint: "#94A3B8",

  // States
  success: "#15803D",
  successSoft: "#DCFCE7",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  whatsapp: "#25D366",
} as const;

export const font = {
  display: "'Unbounded', sans-serif",
  body: "'DM Sans', system-ui, sans-serif",
  mono: "'Fira Mono', monospace",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  pill: "999px",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(13,23,40,.06)",
  md: "0 8px 24px rgba(13,23,40,.08)",
  lg: "0 18px 50px rgba(13,23,40,.12)",
  nav: "0 6px 24px rgba(7,17,31,.08)",
} as const;

export const layout = {
  maxWidth: 1240,
  pad: 40,
} as const;
