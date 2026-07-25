import type * as React from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

type DropdownProps = {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: number;
  /**
   * Saca el padding del panel para que un hijo pueda ocupar el ancho completo
   * (una cabecera con fondo propio, una imagen, un banner). El caller pasa a
   * ser responsable del padding de las secciones que sí lo necesiten.
   *
   * Existe por el menú de cuenta: su cabecera oscura quedaba flotando con un
   * marco blanco alrededor y, al comerse esos píxeles a cada lado, el nombre
   * y el mail se partían al medio ("Administrado / r"). Se resuelve acá y no
   * con márgenes negativos en el hijo porque un margen negativo tiene que
   * coincidir a mano con el padding del padre: si alguien cambia el `p-1.5`
   * de abajo, el hijo se desalinea sin que nada avise.
   */
  flush?: boolean;
};

/**
 * Click-to-open menu that closes on outside click or Escape.
 *
 * `width` stays inline (no current caller overrides the 220 default, but
 * it's a free numeric prop). `align` is a two-value enum, handled with
 * `clsx` instead.
 */
export function Dropdown({ trigger, children, align = "right", width = 220, flush = false }: DropdownProps) {
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
            "absolute top-[calc(100%+10px)] bg-white border border-border rounded-md shadow-lg z-[120] animate-[fadeUp_0.14s_ease_both]",
            // `overflow-hidden` sólo en modo flush: es lo que recorta el hijo
            // a fondo completo contra las esquinas redondeadas del panel.
            flush ? "overflow-hidden" : "p-1.5",
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
        // `font-[Inter,sans-serif]` pedía una fuente no cargada (ver Card.tsx).
        "flex items-center gap-2.5 w-full py-2.5 px-3 border-none bg-transparent rounded-md font-body text-[14px] font-medium cursor-pointer text-left hover:bg-surface",
        danger ? "text-danger" : "text-text"
      )}
    >
      {children}
    </As>
  );
}
