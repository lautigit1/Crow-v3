import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Icon, type IconName } from "@/shared/ui";

/**
 * Piezas de formulario compartidas entre las páginas de auth. Ver
 * openspec/changes/2026-07-08-auth-redesign -- segunda vuelta de este
 * rediseño, después de que el usuario rechazara el concepto de ticket/
 * tarjeta flotante y pidiera un panel de acceso integrado (60/40, sin
 * card). Estas piezas (fila de campo, medidor de fuerza, botón, error)
 * sobreviven de la primera vuelta porque nunca fueron el problema -- lo
 * que se descartó fue el envoltorio (ticket) y el panel de contexto, no
 * los inputs en sí.
 */

// ── Field row ("línea de ítem") ──────────────────────────────────────────────

export type FieldDef = {
  key: string;
  index: string;
  label: string;
  type: string;
  icon: IconName;
  autoComplete?: string;
  optional?: boolean;
  minLength?: number;
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function FieldRow({
  def, value, onChange, onFocus, onBlur, forgotLink,
}: {
  def: FieldDef;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  forgotLink?: boolean;
}) {
  const [show, setShow] = useState(false);
  const id = `auth-${def.key}`;
  const isPassword = def.type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : def.type;

  return (
    <div className="border-b-[1.5px] border-[rgba(13,23,40,.14)] py-4 transition-colors duration-150 focus-within:border-ink900">
      <div className="flex items-center gap-3.5">
        <span className="w-4 shrink-0 font-mono text-[10.5px] font-bold text-ink900/25">{def.index}</span>

        <div className="relative flex-1 pt-[14px]">
          <input
            id={id}
            name={def.key}
            type={inputType}
            required={!def.optional}
            minLength={def.minLength}
            autoComplete={def.autoComplete}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder=" "
            className="peer w-full bg-transparent font-body text-[16px] text-ink900 outline-none placeholder:text-transparent"
          />
          <label
            htmlFor={id}
            className={clsx(
              "pointer-events-none absolute left-0 top-[14px] font-body text-[16px] text-ink900/40 transition-all duration-150",
              "peer-focus:top-0 peer-focus:font-mono peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[.1em] peer-focus:text-primary",
              "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:font-mono peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[.1em] peer-[:not(:placeholder-shown)]:text-ink900/45"
            )}
          >
            {def.label}
            {def.optional && <span className="font-body text-[11px] font-normal normal-case text-ink900/35"> · opcional</span>}
          </label>
        </div>

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="shrink-0 rounded p-1 text-ink900/35 outline-none transition-colors hover:text-ink900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <EyeIcon open={show} />
          </button>
        ) : (
          <span className="shrink-0 text-ink900/25">
            <Icon name={def.icon} size={16} />
          </span>
        )}
      </div>

      {forgotLink && (
        <Link to="/forgot-password" className="mt-2 inline-block font-body text-[12.5px] font-semibold text-primary no-underline">
          ¿Olvidaste tu contraseña?
        </Link>
      )}
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────

export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABEL = ["", "Débil", "Regular", "Buena", "Fuerte"];
const STRENGTH_COLOR = ["", "bg-danger", "bg-[#B45309]", "bg-[#0891B2]", "bg-success"];

export function PasswordStrengthMeter({ value }: { value: string }) {
  const s = passwordStrength(value);
  if (!value) return null;
  return (
    <div className="mb-1 mt-2.5 flex items-center gap-2 pl-[30px]">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={clsx("h-[3px] flex-1 rounded-full", i <= s ? STRENGTH_COLOR[s] : "bg-ink900/10")} />
        ))}
      </div>
      <span className="font-mono text-[10px] text-ink900/40">{STRENGTH_LABEL[s]}</span>
    </div>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────

export function StampButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={loading ? undefined : { y: -2, boxShadow: "0 14px 32px rgba(7,17,31,.3)" }}
      whileTap={loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={clsx(
        "mt-8 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full font-display text-[15px] font-bold tracking-[-.01em] outline-none transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        loading ? "cursor-not-allowed bg-ink900/50 text-white/70" : "cursor-pointer bg-ink900 text-white"
      )}
    >
      {loading ? (
        <>
          <span className="flex gap-[3px]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[5px] w-[5px] rounded-full bg-white/70" style={{ animation: `pulse-glow 1.1s ${i * 0.15}s ease-in-out infinite` }} />
            ))}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[.14em]">{loadingLabel}…</span>
        </>
      ) : (
        <>
          {label}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </>
      )}
    </motion.button>
  );
}

// ── Error strip ───────────────────────────────────────────────────────────────

export function AuthError({ message }: { message: string }) {
  return (
    <div className="mt-5 flex items-start gap-2.5 border-l-[3px] border-danger py-1 pl-3">
      <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-danger" />
      <p className="m-0 font-body text-[13px] leading-snug text-ink900">{message}</p>
    </div>
  );
}
