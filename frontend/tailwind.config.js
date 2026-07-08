/**
 * Tailwind config generated 1:1 from src/shared/config/theme.ts.
 *
 * Every value here is copy-pasted from theme.ts, not "rounded" to Tailwind's
 * default scale -- the goal of this migration is zero visual diff versus the
 * inline styles it replaces, so the numbers must match exactly.
 *
 * theme.ts keeps existing (still imported by any file not yet migrated,
 * and by non-component code like email templates on the backend side is N/A
 * here). Once every component is migrated, theme.ts can be deleted and this
 * file becomes the single source of truth.
 */
/** @type {import('tailwindcss').Config} */
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
        primary: "#0057D9",
        primaryDark: "#0047B3",
        primarySoft: "#E8F0FE",

        // Industrial navies
        ink900: "#07111F",
        ink800: "#0D1728",
        ink700: "#1E293B",

        // Neutrals
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
};
