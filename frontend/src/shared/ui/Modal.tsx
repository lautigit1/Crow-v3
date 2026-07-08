import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

// `width` stays as an inline style: no current caller overrides the 480
// default, but it's a public numeric prop that could be passed any value,
// which Tailwind can't turn into a static class. Everything else is fixed.
export function Modal({ open, onClose, title, eyebrow, children, footer, width = 480 }: ModalProps) {
  if (!open) return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-[rgba(4,10,20,.38)] backdrop-blur flex items-center justify-center p-6 animate-[fadeUp_0.18s_ease_both]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[calc(100vh-48px)] rounded-[14px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,.45),0_0_0_1px_rgba(255,255,255,.04)] flex flex-col animate-[fadeUp_0.2s_ease_both]"
        style={{ maxWidth: width }}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-ink900 py-4.5 px-[22px] shrink-0">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
          <div className="absolute -top-[50px] -right-[30px] w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.2)_0%,transparent_70%)] pointer-events-none" />

          <div className="flex items-center justify-between gap-4 relative">
            <div>
              {eyebrow && (
                <div className="font-mono text-[10px] tracking-[0.2em] text-[#5B8BDF] mb-1.5 uppercase">
                  {eyebrow}
                </div>
              )}
              {title && (
                <div className="font-display text-[19px] font-extrabold text-white tracking-[-0.015em]">
                  {title}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex-none border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.06)] text-[rgba(255,255,255,.5)] text-[16px] leading-none cursor-pointer rounded-[7px] flex items-center justify-center transition-[background-color,color] duration-150 hover:bg-[rgba(255,255,255,.14)] hover:text-white"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="py-4 px-5 bg-surface overflow-y-auto flex-1 min-h-0">{children}</div>

        {/* ── Footer (submit button lives here) ────────────── */}
        {footer && <div className="py-3.5 px-[22px] bg-white border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
