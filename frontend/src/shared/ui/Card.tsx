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

/**
 * Estado vacío de una lista.
 *
 * Se veía "por defecto" por una razón concreta: pedía `Archivo` para el
 * título e `Inter` para el texto, y ninguna de las dos está cargada. El
 * proyecto sirve Unbounded, DM Sans y Fira Mono (ver los imports de
 * `@fontsource` en main.tsx); `Archivo`/`Inter` son restos de una paleta
 * tipográfica anterior. Como el navegador no las encuentra, caía al
 * `sans-serif` genérico del sistema -- Arial o Helvetica según la máquina.
 * Era el único lugar del sitio que no usaba las fuentes de la marca.
 *
 * Ahora usa `font-display` (Unbounded) y `font-body` (DM Sans), las mismas
 * clases que el resto de la interfaz.
 *
 * De paso: el padding horizontal era `px-7.5`, una clase que Tailwind no
 * genera (la escala tiene 0.5, 1.5, 2.5 y 3.5, pero no 7.5), así que el
 * bloque venía sin padding lateral y el texto llegaba hasta el borde en
 * pantallas angostas.
 */
export function EmptyState({
  icon, title, message, action,
}: {
  /** Ícono opcional dentro de un círculo -- un estado vacío sin nada más que
   *  texto centrado es indistinguible de un error de carga. */
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white px-6 py-16 text-center">
      {icon && (
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-textFaint">
          {icon}
        </div>
      )}
      <h2 className="m-0 font-display text-[20px] font-extrabold tracking-[-.02em] text-ink900">{title}</h2>
      {message && (
        <p
          className={clsx(
            // `max-w` + `mx-auto`: una línea centrada que cruza toda la
            // tarjeta obliga al ojo a recorrer de punta a punta para volver
            // al principio. Acotarla a ~46 caracteres la vuelve legible.
            "mx-auto mt-2.5 max-w-[420px] font-body text-[14.5px] leading-[1.65] text-textMuted",
            action ? "mb-6" : "mb-0"
          )}
        >
          {message}
        </p>
      )}
      {action}
    </div>
  );
}
