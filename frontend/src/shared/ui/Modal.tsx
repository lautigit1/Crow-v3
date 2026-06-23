import type { ReactNode } from "react";
import { color, font, radius, shadow } from "@/shared/config/theme";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  width?: number;
};

export function Modal({ open, onClose, title, eyebrow, children, width = 480 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(7,17,31,.62)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeUp .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: width,
          borderRadius: radius.md,
          overflow: "hidden",
          boxShadow: shadow.lg,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {(title || eyebrow) && (
          <div style={{ background: color.ink800, padding: "22px 26px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              {eyebrow && (
                <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".14em", color: color.primary, marginBottom: 10 }}>
                  {eyebrow}
                </div>
              )}
              {title && <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 800, color: "#fff" }}>{title}</div>}
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "#fff", fontSize: 18, cursor: "pointer", borderRadius: radius.sm, flex: "none" }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: "24px 26px", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
