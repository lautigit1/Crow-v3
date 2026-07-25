import type { ReactNode } from "react";
import { Icon, type IconName } from "@/shared/ui";

/**
 * Encabezado oscuro de las páginas de "Mi cuenta".
 *
 * Existía cuatro veces copiado a mano (ProfilePage, FavoritesPage,
 * MyQuotesPage, MyOrdersPage), y las cuatro copias ya habían empezado a
 * separarse: distinto padding (`pt-7 px-7 pb-6` vs `py-[22px] px-7`),
 * distinto tamaño de título (22px vs 20px), distinto tamaño de halo. Nadie
 * lo hizo a propósito -- es lo que pasa siempre con un bloque duplicado.
 *
 * `accent` es el color del ícono: es el único parámetro que de verdad
 * cambiaba entre páginas (rosa en favoritos, azul en cotizaciones…), y viaja
 * como estilo inline porque es un hex libre que Tailwind no puede convertir
 * en clase estática.
 */
export function AccountPageHeader({
  icon, accent, title, subtitle, action, aside,
}: {
  icon: IconName;
  accent?: string;
  title: string;
  subtitle?: string;
  /** Botón o link alineado a la derecha. */
  action?: ReactNode;
  /** Bloque a la derecha, por encima de `action` (ej: los datos de cuenta). */
  aside?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[14px] bg-ink900 px-7 py-6 shadow-[0_4px_24px_rgba(7,17,31,.1)]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
      {/* .10 en vez de .18/.2: a esa opacidad el halo dejaba ver su propio
          borde y se leía como una mancha, no como iluminación. */}
      <div className="pointer-events-none absolute -right-8 -top-14 h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.1)_0%,transparent_70%)]" />

      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.06)]"
            style={{ color: accent ?? "#7FB0FF" }}
          >
            <Icon name={icon} size={21} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 font-display text-[21px] font-black leading-tight tracking-[-.025em] text-white">
              {title}
            </h1>
            {subtitle && (
              /* #8AA3BC (~7:1 sobre ink900) en vez del #94A3B8 / #7FB0FF que
                 usaban las copias: mismo gris azulado que el resto del sitio
                 sobre fondo oscuro, y sin quedar por debajo de AA. */
              <p className="m-0 mt-1 font-body text-[13.5px] leading-snug text-[#8AA3BC]">{subtitle}</p>
            )}
          </div>
        </div>

        {(aside || action) && (
          <div className="flex shrink-0 items-center gap-2.5">
            {aside}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dato suelto dentro del encabezado ("Miembro desde", "Último acceso").
 *
 * La etiqueta estaba en Fira Mono 9px mayúscula con .1em de tracking: nueve
 * píxeles es más chico que cualquier mínimo razonable, y en mayúscula
 * espaciada era una fila de letras sueltas más que una palabra.
 */
export function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.05)] px-4 py-2.5">
      <div className="font-body text-[11.5px] font-medium leading-none text-[#8AA3BC]">{label}</div>
      <div className="mt-1.5 font-body text-[13.5px] font-semibold leading-none text-white">{value}</div>
    </div>
  );
}
