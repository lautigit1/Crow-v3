import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { api as apiClient, apiError } from "@/shared/api";
import { Icon } from "@/shared/ui";
import { AuthShell, InfoBlock, MobileTopStrip } from "./AuthShell";
import { AuthError, FieldRow, StampButton, type FieldDef } from "./AuthFormKit";

const EMAIL_FIELD: FieldDef = { key: "email", index: "01", label: "Email", type: "email", icon: "mail", autoComplete: "email" };

export function ForgotPasswordPage() {
  usePageMeta("Recuperar contraseña", "Ingresá tu email y te mandamos un enlace para restablecer tu contraseña.");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(apiError(err, "No pudimos procesar la solicitud. Intentá de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      info={
        <InfoBlock
          eyebrow="Recuperar acceso"
          title="Pasa, así te ayudamos."
          subtitle="Te mandamos un enlace a tu email para elegir una contraseña nueva."
        />
      }
    >
      <MobileTopStrip />

      <div className="w-full max-w-[440px] lg:max-w-[420px]">
        {sent ? (
          <div className="py-2">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF4FF]">
              <Icon name="mail" size={22} className="text-primary" />
            </div>
            <h1 className="mb-2.5 font-display text-[26px] font-black tracking-[-.02em] text-ink900">Revisá tu bandeja</h1>
            <p className="mb-5 font-body text-[14px] leading-[1.65] text-ink900/55">
              Si el email <strong className="text-ink900">{email}</strong> está registrado, vas a recibir un enlace en los próximos minutos.
            </p>
            <p className="font-body text-[12.5px] text-ink900/40">No olvides revisar la carpeta de spam.</p>
          </div>
        ) : (
          <>
            <h1 className="mb-1.5 font-display text-[30px] font-black leading-tight tracking-[-.02em] text-ink900">
              Recuperar contraseña
            </h1>
            <p className="mb-8 font-body text-[14px] leading-snug text-ink900/50">
              Ingresá tu email y te mandamos un enlace de recuperación.
            </p>

            <form onSubmit={submit} className="flex flex-col">
              <FieldRow def={EMAIL_FIELD} value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />

              {error && <AuthError message={error} />}

              <StampButton loading={loading} label="Enviar enlace" loadingLabel="Enviando" />
            </form>
          </>
        )}

        <p className="mt-6 font-body text-[12.5px] text-ink900/45">
          <Link to="/login" className="font-semibold text-primary no-underline">← Volver al login</Link>
        </p>
      </div>
    </AuthShell>
  );
}
