import { useEffect, useId, type ReactNode } from "react";
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

/**
 * Ventana modal del panel admin.
 *
 * La versión anterior apilaba tres fondos distintos en 400px de alto:
 * encabezado azul marino (con línea de gradiente y un halo radial encima),
 * cuerpo gris y pie blanco. Cada franja era defendible por separado, pero
 * juntas hacían que la ventana leyera como tres tarjetas pegadas en vez de
 * una sola pieza -- y el gris del cuerpo era exactamente el mismo color que
 * el de los campos, así que los inputs desaparecían contra su contenedor.
 *
 * Ahora es una sola superficie blanca con dos separadores de 1px: el peso
 * visual lo llevan la tipografía y el espaciado, no los cambios de color.
 * La identidad de marca queda en el eyebrow (mono, en azul primario) y en el
 * título en Unbounded, que es donde se nota sin competir con el contenido.
 *
 * `width` sigue como estilo inline: es una prop numérica pública que puede
 * recibir cualquier valor, y Tailwind no puede generar clases estáticas para
 * un número arbitrario en runtime.
 */
export function Modal({ open, onClose, title, eyebrow, children, footer, width = 480 }: ModalProps) {
  const titleId = useId();

  // Escape para cerrar y bloqueo del scroll de fondo. Los dos son gestos que
  // se dan por sentados en cualquier modal; sin ellos la ventana se siente
  // "dentro de la página" en vez de una capa aparte -- scrollear con la rueda
  // movía el listado de atrás mientras el formulario seguía abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-[rgba(7,17,31,.5)] backdrop-blur-[3px] animate-[fadeUp_.16s_ease_both]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={
          "w-full max-h-[calc(100vh-40px)] flex flex-col overflow-hidden rounded-[16px] bg-white " +
          // Sombra en dos capas: una difusa y desplazada hacia abajo que
          // levanta la ventana del fondo, y un hairline de 1px que le da
          // borde nítido contra el overlay sin usar un `border` real (que
          // sumaría al box model y desalinearía el radio de las esquinas).
          "shadow-[0_32px_80px_-16px_rgba(7,17,31,.35),0_0_0_1px_rgba(13,23,40,.06)] " +
          "animate-[fadeUp_.22s_cubic-bezier(.22,1,.36,1)_both]"
        }
        style={{ maxWidth: width }}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="relative shrink-0 border-b border-border px-7 pt-6 pb-5">
          <div className="pr-10">
            {eyebrow && (
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-primary">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2
                id={titleId}
                className="m-0 font-display text-[21px] font-extrabold leading-none tracking-[-.02em] text-ink900"
              >
                {title}
              </h2>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-5 top-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-textFaint transition-colors duration-150 hover:bg-surface hover:text-ink900"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-7 py-6">{children}</div>

        {/* ── Footer (el botón de submit vive acá) ─────────── */}
        {/* `flex` a propósito: varios callers mandan un mensaje de error con
            `flex-1` al lado del botón, que sin contenedor flex quedaba
            apilado arriba en vez de compartir la fila. */}
        {footer && (
          <div className="flex shrink-0 items-center gap-4 border-t border-border bg-surface px-7 py-5">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
