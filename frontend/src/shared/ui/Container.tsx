import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { layout } from "@/shared/config";

/**
 * Centered content column with the standard max width and side padding.
 *
 * `maxWidth` stays as an inline style: callers override it with different
 * one-off numbers (760, 560, 640...), which Tailwind can't turn into a
 * static class at build time. The mobile/desktop padding switch used to be
 * driven by the `useBreakpoint()` JS hook (`isMobile` at width < 768) --
 * that threshold is exactly Tailwind's `md:` breakpoint (min-width: 768px),
 * so it's now a real CSS media query (`px-4 md:px-[40px]`) instead of a
 * JS-computed value, same visual result without a resize listener.
 */
export function Container({
  children,
  style,
  className,
  maxWidth = layout.maxWidth,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <div className={clsx("mx-auto w-full box-border px-4 md:px-[40px]", className)} style={{ maxWidth, ...style }}>
      {children}
    </div>
  );
}
