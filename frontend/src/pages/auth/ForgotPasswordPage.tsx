import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { color, font, radius } from "@/shared/config/theme";
import { api as apiClient, apiError } from "@/shared/api/client";

function PremiumInput({ type = "text", value, onChange, placeholder, required }: {
  type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%", boxSizing: "border-box",
        height: 46, padding: "0 14px",
        fontFamily: font.body, fontSize: 14, color: color.ink900,
        background: color.surface, border: `1.5px solid ${focused ? color.primary : color.border}`,
        borderRadius: radius.md, outline: "none",
        boxShadow: focused ? `0 0 0 3px rgba(0,87,217,.1)` : "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
    />
  );
}

export function ForgotPasswordPage() {
  usePageMeta("Recuperar contraseña", "Ingresá tu email y te mandamos un enlace para restablecer tu contraseña.");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

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
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y te mandamos un enlace para restablecer tu contraseña."
      footer={<><Link to="/login" style={{ color: color.primary, fontWeight: 700 }}>← Volver al login</Link></>}
    >
      {sent ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          {/* Envelope icon */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#EEF4FF", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h3 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, color: color.ink900, margin: "0 0 10px" }}>
            Revisá tu bandeja
          </h3>
          <p style={{ fontFamily: font.body, fontSize: 14, color: color.textMuted, lineHeight: 1.65, margin: "0 0 20px" }}>
            Si el email <strong style={{ color: color.ink800 }}>{email}</strong> está registrado, vas a recibir un enlace en los próximos minutos.
          </p>
          <p style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint, margin: 0 }}>
            No olvides revisar la carpeta de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ display: "block", fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink800, marginBottom: 6 }}>
              Email
            </label>
            <PremiumInput
              type="email" required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
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
                Enviando…
              </>
            ) : "Enviar enlace de recuperación"}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      )}
    </AuthShell>
  );
}
