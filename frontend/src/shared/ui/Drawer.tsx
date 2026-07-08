import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

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
      className="fixed inset-0 z-[200] bg-[rgba(4,10,20,.68)] backdrop-blur-sm flex justify-end animate-[fadeUp_0.15s_ease_both]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full bg-white shadow-[-24px_0_80px_rgba(0,0,0,.28)] flex flex-col animate-[slideInRight_0.22s_cubic-bezier(.25,.46,.45,.94)_both]"
        style={{ maxWidth: width }}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-ink900 py-5 px-6 shrink-0">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,#0057D9,#7FB0FF_60%,transparent)]" />
          {/* Glow */}
          <div className="absolute -top-[60px] -right-[30px] w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.16)_0%,transparent_70%)] pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative">
            <div>
              {eyebrow && (
                <div className="font-mono text-[10.5px] tracking-[0.18em] text-[#7FB0FF] mb-2 uppercase">
                  {eyebrow}
                </div>
              )}
              {title && (
                <div className="font-display text-[20px] font-extrabold text-white tracking-[-0.01em]">
                  {title}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-[30px] h-[30px] flex-none border border-[rgba(255,255,255,.15)] bg-[rgba(255,255,255,.06)] text-[rgba(255,255,255,.6)] cursor-pointer rounded-md flex items-center justify-center transition-[background-color,color] duration-150 hover:bg-[rgba(255,255,255,.14)] hover:text-white"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="py-[22px] px-6 overflow-y-auto flex-1 bg-[#FAFBFD]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="py-3.5 px-5 border-t border-border flex gap-2.5 bg-white shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
