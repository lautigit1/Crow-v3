import type { CSSProperties, ReactNode } from "react";
import { color, radius } from "@/shared/config/theme";

/** Plain white surface card with a subtle border. */
export function Card({ children, style, pad = 22 }: { children: ReactNode; style?: CSSProperties; pad?: number }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.border}`, borderRadius: radius.md, padding: pad, ...style }}>
      {children}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px dashed ${color.borderStrong}`,
        borderRadius: radius.md,
        padding: "56px 30px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "'Archivo',sans-serif", fontSize: 19, fontWeight: 800, color: color.ink900, marginBottom: 8 }}>{title}</div>
      {message && <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14.5, lineHeight: 1.6, color: color.textMuted, marginBottom: action ? 20 : 0 }}>{message}</p>}
      {action}
    </div>
  );
}
