import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { color, font, radius } from "@/shared/config/theme";
import { api as apiClient, apiError } from "@/shared/api/client";

function PasswordInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? "••••••••"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", boxSizing: "border-box",
          height: 46, padding: "0 44px 0 14px",
          fontFamily: font.body, fontSize: 14, color: color.ink900,
          background: color.surface, border: `1.5px solid ${focused ? color.primary : color.border}`,
          borderRadius: radius.md, outline: "none",
          boxShadow: focused ? `0 0 0 3px rgba(0,87,217,.1)` : "none",
          transition: "border-color .15s, box-shadow .15s",
        }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: color.textFaint, lineHeight: 0,
        }}
      >
        {show ? (
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function ResetPasswordPage() {
  usePageMeta("Nueva contraseña", "Elegí una nueva contraseña para tu cuenta Crow Repuestos.");
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();
  const token                 = searchParams.get("token") ?? "";
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  // Token missing → show error immediately
  if (!token) {
    return (
      <AuthShell
        title="Enlace inválido"
        subtitle="Este enlace de recuperación no es válido o ya expiró."
        footer={<Link to="/forgot-password" style={{ color: color.primary, fontWeight: 700 }}>Solicitar nuevo enlace</Link>}
      >
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={color.danger} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontFamily: font.body, fontSize: 14, color: color.textMuted, margin: 0 }}>
            Los enlaces de recuperación son de un solo uso y expiran en 60 minutos.
          </p>
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
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elegí una contraseña segura para tu cuenta."
      footer={done ? (
        <Link to="/login" style={{ color: color.primary, fontWeight: 700 }}>Ir al login →</Link>
      ) : (
        <Link to="/login" style={{ color: color.primary, fontWeight: 700 }}>← Volver al login</Link>
      )}
    >
      {done ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#ECFDF5", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: color.ink900, margin: "0 0 10px" }}>
            Contraseña actualizada
          </h3>
          <p style={{ fontFamily: font.body, fontSize: 14, color: color.textMuted, lineHeight: 1.65, margin: "0 0 24px" }}>
            Tu contraseña fue cambiada con éxito. Podés iniciar sesión con tus nuevas credenciales.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{
              height: 46, width: "100%",
              background: color.primary, color: "#fff",
              border: "none", borderRadius: radius.md,
              fontFamily: font.display, fontSize: 15, fontWeight: 700,
              cursor: "pointer", letterSpacing: "-.01em",
            }}
          >
            Ir al login
          </button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ display: "block", fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink800, marginBottom: 6 }}>
              Nueva contraseña
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink800, marginBottom: 6 }}>
              Confirmar contraseña
            </label>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repetí la contraseña"
            />
          </div>

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 14px",
              background: color.dangerSoft, border: `1px solid #FECACA`,
              borderRadius: radius.md,
              fontFamily: font.body, fontSize: 13, color: color.danger,
            }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 48, width: "100%",
              background: loading ? color.textFaint : color.primary,
              color: "#fff", border: "none", borderRadius: radius.md,
              fontFamily: font.display, fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "background .15s",
              letterSpacing: "-.01em",
            }}
          >
            {loading ? (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Guardando…
              </>
            ) : "Guardar nueva contraseña"}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      )}
    </AuthShell>
  );
}
