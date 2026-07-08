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

/**
 * `size` (any number, 28-64 across current callers), the hash-derived
 * background/text color, and the size-derived font size are genuinely
 * dynamic at runtime -- Tailwind's build-time class scanner can't turn a
 * computed value into a static utility, so those three stay as inline
 * style. Everything with a fixed value moved to Tailwind classes.
 */
export function Avatar({ name, size = 38, dark }: { name: string; size?: number; dark?: boolean }) {
  const [bg, fg] = nameToColor(name);
  return (
    <span
      className="flex-none flex items-center justify-center rounded-full font-display font-bold"
      style={{
        width: size,
        height: size,
        background: dark ? "rgba(255,255,255,.1)" : bg,
        color: dark ? "#fff" : fg,
        fontSize: size * 0.38,
      }}
    >
      {initials(name) || "?"}
    </span>
  );
}
