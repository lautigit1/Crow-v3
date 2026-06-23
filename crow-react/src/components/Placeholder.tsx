import type { CSSProperties, ReactNode } from "react";

/** Diagonal-stripe pattern used for every "[ FOTO ]" image placeholder. */
export function stripes(opacity = 0.05, gap = 14): string {
  const span = gap * 2;
  return `repeating-linear-gradient(135deg,rgba(255,255,255,${opacity}) 0 ${gap}px,rgba(255,255,255,0) ${gap}px ${span}px)`;
}

/** Dark stripe variant for light backgrounds. */
export function darkStripes(opacity = 0.05, gap = 13): string {
  const span = gap * 2;
  return `repeating-linear-gradient(135deg,rgba(10,22,34,${opacity}) 0 ${gap}px,rgba(10,22,34,0) ${gap}px ${span}px)`;
}

type PhotoProps = {
  label: string;
  /** Aspect ratio (width / height). */
  ratio?: number;
  background?: string;
  pattern?: string;
  labelColor?: string;
  align?: "flex-start" | "flex-end";
  justify?: "flex-start" | "space-between";
  padding?: number;
  style?: CSSProperties;
  children?: ReactNode;
};

/** A captioned placeholder block standing in for a real photo. */
export default function Photo({
  label,
  ratio = 1.5,
  background = "#0E1E30",
  pattern = stripes(0.04, 16),
  labelColor = "rgba(255,255,255,.45)",
  align = "flex-end",
  justify = "flex-start",
  padding = 16,
  style,
  children,
}: PhotoProps) {
  return (
    <div
      style={{
        aspectRatio: String(ratio),
        background,
        backgroundImage: pattern,
        display: "flex",
        alignItems: align,
        justifyContent: justify,
        padding,
        ...style,
      }}
    >
      <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".06em", color: labelColor }}>{label}</span>
      {children}
    </div>
  );
}
