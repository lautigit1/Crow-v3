import type * as React from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { color, radius, shadow } from "@/shared/config/theme";

type DropdownProps = {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: number;
};

/** Click-to-open menu that closes on outside click or Escape. */
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
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: align === "left" ? 0 : undefined,
            right: align === "right" ? 0 : undefined,
            width,
            background: "#fff",
            border: `1px solid ${color.border}`,
            borderRadius: radius.md,
            boxShadow: shadow.lg,
            padding: 6,
            zIndex: 120,
            animation: "fadeUp .14s ease both",
          }}
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
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "9px 11px",
    border: "none",
    background: "transparent",
    borderRadius: radius.sm,
    fontFamily: "'Inter',sans-serif",
    fontSize: 13.5,
    fontWeight: 500,
    color: danger ? color.danger : color.text,
    cursor: "pointer",
    textAlign: "left",
  };
  return (
    <As
      to={to}
      onClick={onClick}
      style={style}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = color.surface)}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </As>
  );
}
