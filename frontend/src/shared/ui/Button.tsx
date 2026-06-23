import type { CSSProperties, ElementType, ReactNode } from "react";
import { Hoverable } from "@/shared/lib/Hoverable";
import { color, font, radius } from "@/shared/config/theme";

type Variant = "primary" | "outline" | "ghost" | "dark" | "whatsapp" | "danger";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, CSSProperties> = {
  sm: { height: 38, padding: "0 16px", fontSize: 13 },
  md: { height: 44, padding: "0 20px", fontSize: 14 },
  lg: { height: 52, padding: "0 28px", fontSize: 15 },
};

const variants: Record<Variant, { base: CSSProperties; hover: CSSProperties }> = {
  primary: {
    base: { background: color.primary, color: "#fff", border: "1px solid " + color.primary },
    hover: { background: color.primaryDark, borderColor: color.primaryDark },
  },
  outline: {
    base: { background: "#fff", color: color.ink800, border: "1px solid " + color.borderStrong },
    hover: { borderColor: color.primary, color: color.primary },
  },
  ghost: {
    base: { background: "transparent", color: color.ink800, border: "1px solid transparent" },
    hover: { background: color.surface },
  },
  dark: {
    base: { background: color.ink800, color: "#fff", border: "1px solid " + color.ink800 },
    hover: { background: color.ink900 },
  },
  whatsapp: {
    base: { background: color.whatsapp, color: "#06371a", border: "1px solid " + color.whatsapp },
    hover: { background: "#1fbb59", borderColor: "#1fbb59" },
  },
  danger: {
    base: { background: "#fff", color: color.danger, border: "1px solid " + color.dangerSoft },
    hover: { borderColor: color.danger, background: color.dangerSoft },
  },
};

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  as?: ElementType;
  fullWidth?: boolean;
  style?: CSSProperties;
  [key: string]: unknown;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  as = "button",
  fullWidth,
  style,
  ...rest
}: ButtonProps) {
  const v = variants[variant];
  return (
    <Hoverable
      as={as}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        borderRadius: radius.sm,
        fontFamily: font.body,
        fontWeight: 600,
        letterSpacing: ".01em",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background .16s, border-color .16s, color .16s",
        width: fullWidth ? "100%" : undefined,
        ...sizes[size],
        ...v.base,
        ...style,
      }}
      hoverStyle={v.hover}
      {...rest}
    >
      {children}
    </Hoverable>
  );
}
