import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { color, font, shadow } from "@/shared/config/theme";

/** Right-side slide-in panel for detail views. */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(7,17,31,.55)", display: "flex", justifyContent: "flex-end", animation: "fadeUp .15s ease both" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          height: "100%",
          background: "#fff",
          boxShadow: shadow.lg,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ background: color.ink900, padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            {eyebrow && <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".14em", color: color.primary, marginBottom: 8 }}>{eyebrow}</div>}
            {title && <div style={{ fontFamily: font.display, fontSize: 21, fontWeight: 800, color: "#fff" }}>{title}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "#fff", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "16px 24px", borderTop: `1px solid ${color.border}`, display: "flex", gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}
