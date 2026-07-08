import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { api as apiClient, apiError } from "@/shared/api/client";
import { Icon } from "@/shared/ui";
import { AuthShell, InfoBlock, MobileTopStrip } from "./AuthShell";
import { AuthError, FieldRow, StampButton, type FieldDef } from "./AuthFormKit";

const PASSWORD_FIELD: FieldDef = {
  key: "password", index: "01", label: "Nueva contraseña", type: "password", icon: "lock", autoComplete: "new-password", minLength: 10,
};
const CONFIRM_FIELD: FieldDef = {
  key: "confirm", index: "02", label: "Confirmar contraseña", type: "password", icon: "lock", autoComplete: "new-password",
};

export function ResetPasswordPage() {
  usePageMeta("Nueva contraseña", "Elegí una nueva contraseña para tu cuenta Crow Repuestos.");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const info = (
    <InfoBlock
      eyebrow="Nueva contraseña"
      title="Última parada."
      subtitle="Elegí una contraseña segura y volvés a tener acceso a tu cuenta."
    />
  );

  if (!token) {
    return (
      <AuthShell info={info}>
        <MobileTopStrip />
        <div className="w-full max-w-[440px] lg:max-w-[420px]">
          <Icon name="alert" size={30} className="mb-4 block text-danger" />
          <h1 className="mb-2.5 font-display text-[26px] font-black tracking-[-.02em] text-ink900">Enlace inválido</h1>
          <p className="mb-6 font-body text-[14px] leading-[1.65] text-ink900/55">
            Este enlace de recuperación no es válido o ya expiró. Los enlaces son de un solo uso y vencen a los 60 minutos.
          </p>
          <Link to="/forgot-password" className="font-body text-[13px] font-semibold text-primary no-underline">
            Solicitar un enlace nuevo →
          </Link>
        </div>
      </AuthShell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(apiError(err, "El enlace es inválido o ya expiró."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell info={info}>
      <MobileTopStrip />
      <div className="w-full max-w-[440px] lg:max-w-[420px]">
        {done ? (
          <div className="py-2">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Icon name="check" size={22} className="text-success" />
            </div>
            <h1 className="mb-2.5 font-display text-[26px] font-black tracking-[-.02em] text-ink900">Contraseña actualizada</h1>
            <p className="mb-6 font-body text-[14px] leading-[1.65] text-ink900/55">
              Tu contraseña fue cambiada con éxito. Ya podés iniciar sesión con tus nuevas credenciales.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); navigate("/login"); }}>
              <StampButton loading={false} label="Ir al login" loadingLabel="" />
            </form>
          </div>
        ) : (
          <>
            <h1 className="mb-1.5 font-display text-[30px] font-black leading-tight tracking-[-.02em] text-ink900">
              Nueva contraseña
            </h1>
            <p className="mb-8 font-body text-[14px] leading-snug text-ink900/50">
              Elegí una contraseña segura para tu cuenta.
            </p>

            <form onSubmit={submit} className="flex flex-col">
              <FieldRow def={PASSWORD_FIELD} value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
              <FieldRow def={CONFIRM_FIELD} value={confirm} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)} />

              {error && <AuthError message={error} />}

              <StampButton loading={loading} label="Guardar contraseña" loadingLabel="Guardando" />
            </form>

            <p className="mt-6 font-body text-[12.5px] text-ink900/45">
              <Link to="/login" className="font-semibold text-primary no-underline">← Volver al login</Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
