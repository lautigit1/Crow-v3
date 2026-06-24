import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { color, font, radius } from "@/shared/config/theme";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

export function Modal({ open, onClose, title, eyebrow, children, footer, width = 480 }: ModalProps) {
  if (!open) return null;
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(4,10,20,.38)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "fadeUp .18s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "calc(100vh - 48px)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04)",
          display: "flex",
          flexDirection: "column",
          animation: "fadeUp .2s ease both",
        }}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ position: "relative", overflow: "hidden", background: color.ink900, padding: "18px 22px", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)` }} />
          <div style={{ position: "absolute", top: -50, right: -30, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,87,217,.2) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, position: "relative" }}>
            <div>
              {eyebrow && (
                <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".2em", color: "#5B8BDF", marginBottom: 6, textTransform: "uppercase" }}>
                  {eyebrow}
                </div>
              )}
              {title && (
                <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "-.015em" }}>
                  {title}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, flex: "none",
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)",
                color: "rgba(255,255,255,.5)",
                fontSize: 16, lineHeight: 1, cursor: "pointer",
                borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.14)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.06)"; e.currentTarget.style.color = "rgba(255,255,255,.5)"; }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div style={{ padding: "16px 20px", background: "#F8FAFC", overflowY: "auto", flex: 1, minHeight: 0 }}>
          {children}
        </div>

        {/* ── Footer (submit button lives here) ────────────── */}
        {footer && (
          <div style={{ padding: "14px 22px", background: "#fff", borderTop: `1px solid ${color.border}`, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
