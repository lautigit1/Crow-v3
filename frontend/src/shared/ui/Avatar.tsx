import { font } from "@/shared/config/theme";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Deterministic palette: [background, text] — distinct hues, accessible contrast. */
const PALETTE: [string, string][] = [
  ["#DBEAFE", "#1D4ED8"], // blue
  ["#D1FAE5", "#065F46"], // green
  ["#FCE7F3", "#9D174D"], // pink
  ["#FEF3C7", "#92400E"], // amber
  ["#EDE9FE", "#5B21B6"], // violet
  ["#FFEDD5", "#9A3412"], // orange
  ["#CFFAFE", "#155E75"], // cyan
  ["#FDF4FF", "#86198F"], // fuchsia
  ["#FFF1F2", "#9F1239"], // rose
  ["#DCFCE7", "#14532D"], // emerald
];

function nameToColor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({ name, size = 38, dark }: { name: string; size?: number; dark?: boolean }) {
  const [bg, fg] = nameToColor(name);
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: dark ? "rgba(255,255,255,.1)" : bg,
        color: dark ? "#fff" : fg,
        fontFamily: font.display,
        fontWeight: 700,
        fontSize: size * 0.38,
      }}
    >
      {initials(name) || "?"}
    </span>
  );
}
