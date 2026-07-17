import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

// Exact 1:1 translation of the previous color/border objects. The border
// colors aren't design tokens (one-off lighter tints per tone), so they
// stay as arbitrary hex values.
const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface text-textMuted border border-border",
  primary: "bg-primarySoft text-primaryDark border border-[#C7DBFB]",
  success: "bg-successSoft text-success border border-[#BBF7D0]",
  warning: "bg-warningSoft text-warning border border-[#FDE68A]",
  // text-danger (#DC2626) sobre bg-dangerSoft daba 3.95:1 -- por debajo del
  // mínimo WCAG AA de 4.5:1 para texto normal (el badge usa 11px, no
  // califica como "texto grande"). #C92020 es el mismo rojo oscurecido
  // apenas lo necesario para pasar (4.63:1); en cualquier otro contexto
  // (botones, texto sobre blanco) sigue usándose `danger` sin cambios.
  danger: "bg-dangerSoft text-[#C92020] border border-[#FECACA]",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-[6px] py-1 px-2.5 rounded-pill font-mono text-[11px] font-semibold tracking-[0.03em] whitespace-nowrap",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}
