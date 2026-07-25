import { forwardRef, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Etiqueta + control.
 *
 * Las etiquetas eran Fira Mono 10px en mayúscula con .14em de tracking. Eso
 * funciona bien en un chip, un badge o el encabezado de una columna -- una
 * palabra suelta que se lee de un vistazo -- pero cansa cuando hay ocho
 * seguidas en un formulario: la mayúscula elimina ascendentes y descendentes
 * (la silueta que el ojo usa para reconocer una palabra sin deletrearla) y el
 * tracking alto separa las letras más de lo que un cuerpo de 10px tolera.
 * Ahora son DM Sans 12.5px semibold en sentence case, la misma familia que el
 * resto de la interfaz.
 *
 * El elemento raíz pasó de <div> a <label> envolviendo al control: da
 * asociación implícita (clickear el texto enfoca el campo, y los lectores de
 * pantalla anuncian la etiqueta) sin tener que generar ids ni clonar
 * children. El <span> sigue siendo hermano directo del control, así que el
 * helper `fieldControl()` de los tests E2E funciona igual que antes.
 */
export function Field({ label, children, hint }: { label?: string; children: ReactNode; hint?: string }) {
  // Varios callers escriben el asterisco de obligatorio dentro del texto
  // ("Nombre del proveedor *"). Se separa acá para pintarlo con el color de
  // marca en vez de dejarlo con el mismo peso que la palabra.
  const isRequired = !!label?.trimEnd().endsWith("*");
  const text = isRequired ? label!.trimEnd().slice(0, -1).trimEnd() : label;

  return (
    <label className="flex flex-col gap-[7px]">
      {label && (
        <span className="font-body text-[12.5px] font-semibold leading-none tracking-[-.005em] text-ink800">
          {text}
          {isRequired && <span className="text-primary"> *</span>}
        </span>
      )}
      {children}
      {hint && <span className="font-body text-[12px] leading-snug text-textFaint">{hint}</span>}
    </label>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InputProps = { style?: CSSProperties; className?: string } & Record<string, any>;

/**
 * Each control below writes its own complete Tailwind class list instead of
 * one shared "base" string with later overrides -- Tailwind resolves
 * conflicting utilities (e.g. two classes both setting `height`) by their
 * order in the *generated* stylesheet, not by their order in `className`,
 * so trying to override `h-11` with `h-auto` via string order would be
 * unreliable. Writing each control's classes explicitly avoids that trap
 * entirely. `style`/`onFocus`/`onBlur` used to be handled with
 * `Object.assign(e.currentTarget.style, ...)` on focus/blur -- that's the
 * same DOM-mutation antipattern already flagged for the admin table hover
 * handlers; native `focus:` variants replace it with the same visual result
 * with no JS needed (removing focus naturally reverts to the base classes).
 *
 * Tres cambios de fondo respecto de la versión anterior:
 *
 *  - Fondo blanco en vez de `bg-surface`. Los controles vivían sobre cuerpos
 *    de modal que también eran `bg-surface`, así que el campo y su contenedor
 *    tenían exactamente el mismo color y lo único que insinuaba dónde se
 *    escribe era el borde. Blanco sobre gris (o blanco con borde nítido)
 *    lee como campo editable sin que haya que buscarlo.
 *  - Borde de 1px en vez de 1.5px, con `borderStrong` en hover. 1.5px es un
 *    grosor que ninguna interfaz usa por gusto; se nota pesado y "de
 *    formulario viejo" cuando hay seis campos apilados.
 *  - Altura 44px y cuerpo 14.5px. 40px con texto de 14px queda apretado para
 *    un panel que se usa todo el día.
 */
const base =
  "w-full box-border rounded-md border border-border bg-white font-body text-[14.5px] text-ink900 outline-none " +
  "shadow-[0_1px_2px_rgba(13,23,40,.04)] placeholder:text-[#94A3B8]";
const interactive =
  "transition-[border-color,box-shadow,background-color] duration-150 hover:border-borderStrong " +
  "focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,87,217,.12)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(({ style, className, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={clsx("h-11 px-3.5", base, interactive, className)}
    style={style}
  />
));
Input.displayName = "Input";

export function Textarea({ style, className, ...rest }: InputProps) {
  return (
    <textarea
      {...rest}
      className={clsx("h-auto min-h-[92px] py-3 px-3.5 leading-[1.6] resize-y", base, interactive, className)}
      style={style}
    />
  );
}

export function Select({ style, className, children, ...rest }: InputProps & { children: ReactNode }) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={clsx("h-11 pl-3.5 pr-10 cursor-pointer appearance-none", base, interactive, className)}
        style={style}
      >
        {children}
      </select>
      <svg
        width={13}
        height={13}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-textFaint"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
