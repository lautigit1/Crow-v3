import type { CSSProperties, ReactNode } from "react";
import { layout } from "@/shared/config/theme";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

/** Centered content column with the standard max width and side padding. */
export function Container({
  children,
  style,
  maxWidth = layout.maxWidth,
}: {
  children: ReactNode;
  style?: CSSProperties;
  maxWidth?: number;
}) {
  const { isMobile } = useBreakpoint();
  const pad = isMobile ? 16 : layout.pad;
  return (
    <div style={{ maxWidth, margin: "0 auto", padding: `0 ${pad}px`, width: "100%", boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}
