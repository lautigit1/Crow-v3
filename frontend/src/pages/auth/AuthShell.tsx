import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/shared/ui";
import { useIsOpenNow } from "@/shared/lib/useIsOpenNow";

/**
 * Panel de acceso integrado -- segunda vuelta de este rediseño (ver
 * openspec/changes/2026-07-08-auth-redesign). La primera versión (ticket
 * de service flotando sobre un lienzo oscuro) fue rechazada: "no me
 * gusta, quiero una nueva reestructura", con un brief detallado pidiendo
 * abandonar por completo la idea de tarjeta -- la pantalla tiene que
 * sentirse como el acceso a un software profesional, no una landing con
 * un login encima.
 *
 * Nueva estructura: split 60/40 sin card. Izquierda (60%, oscuro):
 * información real tipo panel de estado -- no una lista de beneficios.
 * Derecha (40%, claro): el formulario, ancho, edge-to-edge, sin borde ni
 * sombra propia -- es la mitad del panel, no un componente flotando
 * encima de él.
 */
export function AuthShell({ info, children }: { info: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[60%_40%]">
      {/* ── Izquierda: panel de estado (oscuro), solo desktop ──
          En mobile este panel completo desaparece -- no se apila, se
          reemplaza por una tira mínima (ver `MobileTopStrip` más abajo,
          montada por cada página) para que el formulario sea lo primero
          que aparece en pantalla. */}
      <div className="relative hidden flex-col overflow-hidden bg-ink900 px-16 py-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(900px 620px at 8% -10%, rgba(0,87,217,.16), transparent 60%)",
          }}
        />

        <div className="relative flex items-center justify-between">
          <Logo variant="dark" />
          <Link
            to="/"
            className="font-mono text-[11px] tracking-[.08em] text-[#5E819D] no-underline transition-colors duration-150 hover:text-[#7FB0FF]"
          >
            ← VOLVER AL SITIO
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col justify-center">{info}</div>

        <div className="relative flex items-center justify-between border-t border-[rgba(255,255,255,.08)] pt-6">
          <span className="font-mono text-[10.5px] tracking-[.06em] text-[#2A4560]">
            © {new Date().getFullYear()} CROW REPUESTOS
          </span>
          <StatusStrip />
        </div>
      </div>

      {/* ── Derecha: formulario, sin card ── */}
      <div className="flex flex-col bg-white px-6 py-6 sm:px-12 sm:py-10 lg:justify-center lg:px-16 lg:py-10">
        {children}
      </div>
    </div>
  );
}

/** Cabecera mínima de mobile -- reemplaza al panel oscuro completo, que
 *  en pantallas chicas solo se apilaría arriba del formulario. */
export function MobileTopStrip() {
  return (
    <div className="mb-8 flex items-center justify-between lg:hidden">
      <Logo />
      <StatusStrip dark={false} />
    </div>
  );
}

/** Punto en vivo + "Abierto ahora"/"Fuera de horario", horario real del
 *  negocio. `dark` controla si vive sobre `ink900` (panel izquierdo) o
 *  sobre blanco (tira mínima de mobile). */
export function StatusStrip({ dark = true }: { dark?: boolean }) {
  const open = useIsOpenNow();
  return (
    <span className="flex items-center gap-2">
      <span className={`h-[7px] w-[7px] rounded-full ${open ? "bg-[#4ADE80]" : dark ? "bg-[rgba(255,255,255,.3)]" : "bg-textFaint"}`} />
      <span className={`font-mono text-[10.5px] tracking-[.06em] ${dark ? "text-[#5E819D]" : "text-textMuted"}`}>
        {open ? "ABIERTO AHORA" : "FUERA DE HORARIO"}
      </span>
    </span>
  );
}

/** Ficha de métrica -- número mono grande + caption. `accent` reserva el
 *  único uso del cuarto color (ámbar) para una sola ficha, no todas. */
export function MetricTile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="border-l-2 border-[rgba(255,255,255,.1)] py-1 pl-4">
      <div className={`font-display text-[26px] font-black leading-none tracking-[-.02em] ${accent ? "text-[#F2A93B]" : "text-white"}`}>
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[.06em] text-[#63819C]">{label}</div>
    </div>
  );
}

/** Eyebrow + título + subtítulo del panel izquierdo. */
export function InfoBlock({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <span className="font-mono text-[11px] font-bold uppercase tracking-[.14em] text-[#6FA3E0]">{eyebrow}</span>
      <h1 className="mt-3 max-w-[380px] font-display text-[36px] font-black leading-[1.08] tracking-[-.02em] text-white">
        {title}
      </h1>
      <p className="mt-4 max-w-[360px] font-body text-[15px] leading-relaxed text-[#8AA3BC]">{subtitle}</p>
    </div>
  );
}
