import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

/**
 * Plain white surface card with a subtle border.
 *
 * `pad` stays as an inline style on purpose: it's a free-form numeric prop
 * (callers pass 0, 18, 22, or anything else), and Tailwind can't turn a
 * runtime number into a static utility class -- its build-time scanner needs
 * the literal class string to exist somewhere in source. Everything else
 * that only ever takes a fixed set of values moved to Tailwind classes.
 */
export function Card({ children, style, pad = 22 }: { children: ReactNode; style?: CSSProperties; pad?: number }) {
  return (
    <div className="bg-white border border-border rounded-md" style={{ padding: pad, ...style }}>
      {children}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="bg-white border border-dashed border-borderStrong rounded-md py-14 px-7.5 text-center">
      <div className="font-[Archivo,sans-serif] text-[19px] font-extrabold text-ink900 mb-2">{title}</div>
      {message && (
        <p
          className={clsx(
            "font-[Inter,sans-serif] text-[14.5px] leading-[1.6] text-textMuted",
            action ? "mb-5" : "mb-0"
          )}
        >
          {message}
        </p>
      )}
      {action}
    </div>
  );
}
