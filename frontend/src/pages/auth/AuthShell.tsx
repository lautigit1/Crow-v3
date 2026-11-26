import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/shared/ui";
import { useSiteSettings } from "@/entities/settings/useSiteSettings";

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
        <div className="relative flex items-center justify-between">
          <Logo variant="dark" />
          <Link
            to="/"
            className="font-body text-caption text-textOnDarkFaint no-underline transition-colors duration-150 hover:text-white"
          >
            Volver al sitio
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col justify-center">{info}</div>

        <div className="relative flex items-center justify-between border-t border-[rgba(255,255,255,.08)] pt-6">
          <span className="font-body text-[12px] text-textOnDarkFaint">
            © {new Date().getFullYear()} Crow Repuestos
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

/** Horario de atención (de la configuración del negocio). Reemplaza al punto
 *  "Abierto ahora / Fuera de horario": el comercio hoy atiende consultas y ese
 *  estado sugería un local abierto. `dark` indica si va sobre `ink900`. */
export function StatusStrip({ dark = true }: { dark?: boolean }) {
  const { hours } = useSiteSettings();
  return (
    <span className={`font-body text-[12px] ${dark ? "text-textOnDarkFaint" : "text-textMuted"}`}>
      Atención: {hours}
    </span>
  );
}

/** Una promesa del negocio en dos renglones. Antes eran cifras estilizadas
 *  ("1H", "HOY", "100%", "0") en peso 900 con una en ámbar, un color fuera de
 *  la paleta: parecían métricas de un tablero y no lo que son, compromisos. */
export function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-[rgba(255,255,255,.12)] pt-3">
      <div className="font-body text-[15px] font-medium text-white">{value}</div>
      <div className="mt-0.5 font-body text-caption text-textOnDarkFaint">{label}</div>
    </div>
  );
}

/** Eyebrow + título + subtítulo del panel izquierdo. */
export function InfoBlock({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <span className="font-body text-caption text-textOnDarkFaint">{eyebrow}</span>
      <h1 className="mt-3 max-w-[380px] font-display text-display-md font-medium text-white">
        {title}
      </h1>
      <p className="mt-4 max-w-[360px] font-body text-body text-textOnDarkFaint">{subtitle}</p>
    </div>
  );
}
