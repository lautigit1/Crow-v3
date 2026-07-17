import type { Config } from "tailwindcss";
import { color } from "./src/shared/config/theme";

/**
 * Antes este archivo tenía los colores copiados a mano de
 * src/shared/config/theme.ts ("generado 1:1", según el comentario viejo) --
 * dos fuentes que había que mantener sincronizadas manualmente en cada
 * cambio de paleta. Ahora importa `color` directo de theme.ts, así que
 * theme.ts es la única fuente real (ver hallazgo de "necesidad media" de la
 * auditoría técnica del 2026-07-13: "unificar fuente de colores").
 *
 * theme.ts se mantiene porque varios componentes siguen necesitando los
 * valores como strings de JS en tiempo de ejecución -- colores calculados
 * (hue por hash de nombre, transparencia `${color}18`), valores por default
 * de props dinámicas, etc. -- casos que una clase estática de Tailwind no
 * puede cubrir. `font`/`radius`/`shadow`/`layout` de theme.ts no se
 * re-exportan acá: hoy ningún componente los necesita como valor JS (el
 * último caso, AccountMenu.tsx, se migró a clases Tailwind), así que estos
 * grupos solo viven en este archivo.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Preflight (Tailwind's CSS reset) is OFF on purpose: this app already has
  // its own manual reset in app/styles/index.css (`* { margin:0; padding:0 }`,
  // custom button/select/heading behavior). Turning Preflight on would change
  // default rendering of headings, buttons, lists, tables, etc. that today
  // rely on the existing reset -- exactly the kind of silent visual diff
  // this migration is meant to avoid.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // Brand
        primary: color.primary,
        primaryDark: color.primaryDark,
        primarySoft: color.primarySoft,

        // Industrial navies
        ink900: color.ink900,
        ink800: color.ink800,
        ink700: color.ink700,

        // Neutrals
        surface: color.surface,
        border: color.border,
        borderStrong: color.borderStrong,

        // Text
        text: color.text,
        textMuted: color.textMuted,
        textFaint: color.textFaint,
        textOnDark: color.textOnDark,
        textOnDarkFaint: color.textOnDarkFaint,

        // States
        success: color.success,
        successSoft: color.successSoft,
        warning: color.warning,
        warningSoft: color.warningSoft,
        danger: color.danger,
        dangerSoft: color.dangerSoft,
        whatsapp: color.whatsapp,
      },
      fontFamily: {
        display: ["Unbounded", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["Fira Mono", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        pill: "999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(13,23,40,.06)",
        md: "0 8px 24px rgba(13,23,40,.08)",
        lg: "0 18px 50px rgba(13,23,40,.12)",
        nav: "0 6px 24px rgba(7,17,31,.08)",
      },
      maxWidth: {
        layout: "1240px",
      },
      spacing: {
        layoutPad: "40px",
      },
    },
  },
  plugins: [],
} satisfies Config;
