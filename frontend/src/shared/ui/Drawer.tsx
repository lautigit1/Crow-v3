import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { color, font } from "@/shared/config/theme";

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
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(4,10,20,.68)",
        backdropFilter: "blur(4px)",
        display: "flex", justifyContent: "flex-end",
        animation: "fadeUp .15s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          height: "100%",
          background: "#fff",
          boxShadow: "-24px 0 80px rgba(0,0,0,.28)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ position: "relative", overflow: "hidden", background: color.ink900, padding: "20px 24px", flexShrink: 0 }}>
          {/* Top accent */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color.primary}, #7FB0FF 60%, transparent)` }} />
          {/* Glow */}
          <div style={{ position: "absolute", top: -60, right: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,87,217,.16) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, position: "relative" }}>
            <div>
              {eyebrow && (
                <div style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: ".18em", color: "#7FB0FF", marginBottom: 8, textTransform: "uppercase" }}>
                  {eyebrow}
                </div>
              )}
              {title && (
                <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.01em" }}>
                  {title}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 30, height: 30, flex: "none",
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.06)",
                color: "rgba(255,255,255,.6)",
                cursor: "pointer", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.14)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "rgba(255,255,255,.6)"; }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1, background: "#FAFBFD" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${color.border}`, display: "flex", gap: 10, background: "#fff", flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
