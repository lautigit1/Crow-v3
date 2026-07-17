import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "outline" | "ghost" | "dark" | "whatsapp" | "danger";
type Size = "sm" | "md" | "lg";

// Tailwind classes below are a 1:1 translation of the previous CSSProperties
// objects (see git history) -- exact px/hex values, not Tailwind's default
// scale, so there is zero visual diff. Colors use the custom tokens defined
// in tailwind.config.ts (imported directly from shared/config/theme.ts, the
// single source of truth for the palette); the two one-off whatsapp hover
// colors aren't tokens, so they stay as arbitrary values.
const sizeClasses: Record<Size, string> = {
  sm: "h-[38px] px-4 text-[13px]",
  md: "h-[44px] px-5 text-[14px]",
  lg: "h-[52px] px-7 text-[15px]",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white border border-primary hover:bg-primaryDark hover:border-primaryDark",
  outline:
    "bg-white text-ink800 border border-borderStrong hover:border-primary hover:text-primary",
  ghost: "bg-transparent text-ink800 border border-transparent hover:bg-surface",
  dark: "bg-ink800 text-white border border-ink800 hover:bg-ink900",
  whatsapp:
    "bg-whatsapp text-[#06371a] border border-whatsapp hover:bg-[#1fbb59] hover:border-[#1fbb59]",
  danger:
    "bg-white text-danger border border-dangerSoft hover:border-danger hover:bg-dangerSoft",
};

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  as?: ElementType;
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
  [key: string]: unknown;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  as = "button",
  fullWidth,
  style,
  className = "",
  ...rest
}: ButtonProps) {
  return createElement(
    as,
    {
      style,
      className: clsx(
        "inline-flex items-center justify-center gap-[9px] rounded-sm font-body font-semibold tracking-[0.01em] cursor-pointer whitespace-nowrap",
        // Same transition the old `.hoverable` class gave every button:
        // background/border/color over .16s ease (the exact curve, not
        // Tailwind's default easing, via an arbitrary property).
        "[transition:background-color_.16s_ease,border-color_.16s_ease,color_.16s_ease]",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className
      ),
      ...rest,
    },
    children
  );
}
