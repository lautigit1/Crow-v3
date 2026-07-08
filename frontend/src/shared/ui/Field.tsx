import { forwardRef, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";

export function Field({ label, children, hint }: { label?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-ink700 uppercase">{label}</span>
      )}
      {children}
      {hint && <span className="font-body text-[11.5px] text-textFaint -mt-0.5">{hint}</span>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InputProps = { style?: CSSProperties; className?: string } & Record<string, any>;

/**
 * Each control below writes its own complete Tailwind class list instead of
 * one shared "base" string with later overrides -- Tailwind resolves
 * conflicting utilities (e.g. two classes both setting `height`) by their
 * order in the *generated* stylesheet, not by their order in `className`,
 * so trying to override `h-10` with `h-auto` via string order would be
 * unreliable. Writing each control's classes explicitly avoids that trap
 * entirely. `style`/`onFocus`/`onBlur` used to be handled with
 * `Object.assign(e.currentTarget.style, ...)` on focus/blur -- that's the
 * same DOM-mutation antipattern already flagged for the admin table hover
 * handlers; native `focus:` variants replace it with the same visual result
 * with no JS needed (removing focus naturally reverts to the base classes).
 */
const focusRing = "focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,87,217,.1)]";
const transition = "transition-[border-color,box-shadow,background-color] duration-150";

export const Input = forwardRef<HTMLInputElement, InputProps>(({ style, className, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={clsx(
      "h-10 px-3 border-[1.5px] border-border rounded-sm font-body text-[14px] text-ink900 bg-surface outline-none w-full box-border",
      transition,
      focusRing,
      className
    )}
    style={style}
  />
));
Input.displayName = "Input";

export function Textarea({ style, className, ...rest }: InputProps) {
  return (
    <textarea
      {...rest}
      className={clsx(
        "h-auto py-2.5 px-3 border-[1.5px] border-border rounded-sm font-body text-[14px] text-ink900 bg-surface outline-none w-full box-border leading-[1.55] resize-y",
        transition,
        focusRing,
        className
      )}
      style={style}
    />
  );
}

export function Select({ style, className, children, ...rest }: InputProps & { children: ReactNode }) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={clsx(
          "h-10 pl-3 pr-8 border-[1.5px] border-border rounded-sm font-body text-[14px] text-ink900 bg-surface outline-none w-full box-border cursor-pointer appearance-none",
          transition,
          focusRing,
          className
        )}
        style={style}
      >
        {children}
      </select>
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-textFaint"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
