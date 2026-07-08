import type * as React from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

type DropdownProps = {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: number;
};

/**
 * Click-to-open menu that closes on outside click or Escape.
 *
 * `width` stays inline (no current caller overrides the 220 default, but
 * it's a free numeric prop). `align` is a two-value enum, handled with
 * `clsx` instead.
 */
export function Dropdown({ trigger, children, align = "right", width = 220 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          className={clsx(
            "absolute top-[calc(100%+10px)] bg-white border border-border rounded-md shadow-lg p-1.5 z-[120] animate-[fadeUp_0.14s_ease_both]",
            align === "left" ? "left-0" : "right-0"
          )}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  as: As = "button",
  to,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  as?: React.ElementType;
  to?: string;
  danger?: boolean;
}) {
  return (
    <As
      to={to}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2.5 w-full py-[9px] px-[11px] border-none bg-transparent rounded-sm font-[Inter,sans-serif] text-[13.5px] font-medium cursor-pointer text-left hover:bg-surface",
        danger ? "text-danger" : "text-text"
      )}
    >
      {children}
    </As>
  );
}
