/**
 * Design tokens for Crow Repuestos. Inline styles reference these so the
 * corporate palette / typography stay consistent across every component.
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
  display: "'Archivo', sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
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
