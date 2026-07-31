import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useAuth } from "@/entities/session";
import { apiError } from "@/shared/api";
import { AuthShell, MobileTopStrip, MetricTile } from "./AuthShell";
import { AuthError, FieldRow, PasswordStrengthMeter, StampButton, type FieldDef } from "./AuthFormKit";

/**
 * Tercera vuelta del rediseño de auth (ver openspec/changes/2026-07-08-auth-redesign).
 * El brief más reciente pidió explícitamente abandonar el concepto de
 * tarjeta flotante por un panel de acceso integrado 60/40, y -- al mismo
 * tiempo -- volvió sobre un punto que el usuario había cortado antes:
 * "No quiero pestañas tradicionales... que ambos formularios compartan el
 * mismo espacio... que cambiar entre ellos se sienta natural." Esto
 * revive la idea original de un solo componente montado en ambas rutas
 * (antes abandonada a pedido del propio usuario), pero con un selector
 * que NO es una tab bar: dos palabras grandes, tipográficas, una activa
 * y una apagada, con un subrayado que se desliza entre ellas
 * (`layoutId`) -- el propio título de la pantalla funciona como switch.
 *
 * `/login` y `/registro` montan este mismo componente (mismo tipo, misma
 * posición en el árbol dentro de `<GuestOnly>`), así que React no lo
 * desmonta al navegar entre ambas rutas: el formulario ya tipeado
 * sobrevive el cambio de modo.
 */

type Mode = "login" | "register";
type Key = "full_name" | "email" | "phone" | "password";

const ALL_FIELDS: (Omit<FieldDef, "index"> & { modes: Mode[] })[] = [
  { key: "full_name", label: "Nombre completo", type: "text", icon: "users", autoComplete: "name", modes: ["register"] },
  { key: "email", label: "Email", type: "email", icon: "mail", autoComplete: "email", modes: ["login", "register"] },
    // Obligatorio: sin teléfono el botón de WhatsApp del panel no tiene a dónde
  // ir, y WhatsApp es el canal por el que se coordina el pago de todos los
  // pedidos. Se pide acá y no en el checkout, donde sería fricción justo
  // antes de confirmar la compra.
  { key: "phone", label: "Teléfono", type: "tel", icon: "phone", autoComplete: "tel", modes: ["register"] },
  { key: "password", label: "Contraseña", type: "password", icon: "lock", autoComplete: "current-password", modes: ["login", "register"] },
];

const pad = (n: number) => String(n).padStart(2, "0");

const EASE = [0.22, 1, 0.36, 1] as const;

function ModeWord({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={clsx(
        "relative bg-transparent pb-2 font-display font-black leading-none tracking-[-.02em] outline-none transition-all duration-300",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
        active ? "cursor-default text-[30px] text-ink900 sm:text-[34px]" : "cursor-pointer text-[17px] text-ink900/25 hover:text-ink900/45 sm:text-[19px]"
      )}
    >
      {label}
      {active && (
        <motion.span
          layoutId="authModeUnderline"
          className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
    </button>
  );
}

function LeftInfo({ mode }: { mode: Mode }) {
  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <span className="font-mono text-[11px] font-bold uppercase tracking-[.14em] text-[#6FA3E0]">
            {mode === "login" ? "Acceso de cliente" : "Alta de cliente"}
          </span>
          <h1 className="mt-3 max-w-[380px] font-display text-[40px] font-black leading-[1.05] tracking-[-.02em] text-white">
            {mode === "login" ? "Bienvenido de nuevo." : "Creá tu cuenta."}
          </h1>
          <p className="mt-4 max-w-[360px] font-body text-[15px] leading-relaxed text-[#8AA3BC]">
            {mode === "login"
              ? "Entrá para gestionar tus cotizaciones y pedidos."
              : "Registrate gratis y empezá a cotizar repuestos en minutos."}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-7">
        <MetricTile value="1H" label="Respuesta máx." />
        <MetricTile value="HOY" label="Entrega en Mendoza" />
        <MetricTile value="100%" label="Garantía de fábrica" />
        <MetricTile value="0" label="Bots · asesor real" accent />
      </div>
    </div>
  );
}

export function AuthPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode: Mode = location.pathname === "/registro" ? "register" : "login";
  const from = (location.state as { from?: string } | null)?.from;

  usePageMeta(
    mode === "login" ? "Iniciar sesión" : "Crear cuenta",
    mode === "login"
      ? "Ingresá a tu cuenta Crow Repuestos para gestionar cotizaciones y pedidos."
      : "Registrate gratis en Crow Repuestos y empezá a cotizar repuestos en minutos."
  );

  const { login, register } = useAuth();

  const [form, setForm] = useState<Record<Key, string>>({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: Key) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const goTo = (m: Mode) => {
    if (m === mode) return;
    setError("");
    navigate(m === "login" ? "/login" : "/registro");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        const user = await login(form.email, form.password);
        navigate(from ?? (user.role === "ADMIN" ? "/admin" : "/cuenta"), { replace: true });
      } else {
        await register({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone });
        navigate("/cuenta", { replace: true });
      }
    } catch (err) {
      setError(apiError(err, mode === "login" ? "Email o contraseña incorrectos." : "No pudimos crear tu cuenta."));
    } finally {
      setLoading(false);
    }
  };

  const fields = ALL_FIELDS.filter((f) => f.modes.includes(mode));

  return (
    <AuthShell info={<LeftInfo mode={mode} />}>
      <MobileTopStrip />

      <div className="w-full max-w-[440px] lg:max-w-[420px]">
        <div className="mb-2 flex items-baseline gap-5">
          <ModeWord label="Ingresar" active={mode === "login"} onClick={() => goTo("login")} />
          <span className="translate-y-[-3px] font-display text-[18px] font-black text-ink900/10">/</span>
          <ModeWord label="Crear cuenta" active={mode === "register"} onClick={() => goTo("register")} />
        </div>

        <p className="mb-8 font-body text-[14px] leading-snug text-ink900/50">
          {mode === "login" ? "Entrá para gestionar tus cotizaciones y pedidos." : "Registrate gratis y cotizá en minutos."}
        </p>

        <motion.form layout onSubmit={submit} className="flex flex-col">
          <AnimatePresence initial={false}>
            {fields.map((f, i) => (
              <motion.div
                key={f.key}
                layout
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                <FieldRow
                  def={{
                    key: f.key,
                    index: pad(i + 1),
                    label: f.label,
                    type: f.type,
                    icon: f.icon,
                    optional: f.optional,
                    autoComplete: f.key === "password" ? (mode === "register" ? "new-password" : "current-password") : f.autoComplete,
                    minLength: f.key === "password" && mode === "register" ? 10 : undefined,
                  }}
                  value={form[f.key as Key]}
                  onChange={set(f.key as Key)}
                  forgotLink={mode === "login" && f.key === "password"}
                />
                {f.key === "password" && mode === "register" && <PasswordStrengthMeter value={form.password} />}
              </motion.div>
            ))}
          </AnimatePresence>

          {error && <AuthError message={error} />}

          <AnimatePresence initial={false}>
            {mode === "register" && (
              <motion.div
                key="terms"
                layout
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                <p className="mt-5 font-body text-[11.5px] leading-[1.6] text-ink900/45">
                  Al registrarte aceptás nuestros{" "}
                  <Link to="/legal/terminos" className="text-ink900/70 underline underline-offset-2">Términos</Link>
                  {" "}y la{" "}
                  <Link to="/legal/privacidad" className="text-ink900/70 underline underline-offset-2">Política de privacidad</Link>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <StampButton
            loading={loading}
            label={mode === "login" ? "Ingresar" : "Crear cuenta"}
            loadingLabel={mode === "login" ? "Ingresando" : "Creando cuenta"}
          />
        </motion.form>
      </div>
    </AuthShell>
  );
}
