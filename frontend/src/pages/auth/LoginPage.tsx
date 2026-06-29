import type * as React from "react";
import { useState, type FormEvent } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { Field } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiError } from "@/shared/api/client";
import { color, font, radius } from "@/shared/config/theme";

function PasswordInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? "••••••••"}
        style={{
          width: "100%", boxSizing: "border-box",
          height: 44, padding: "0 44px 0 14px",
          fontFamily: font.body, fontSize: 14, color: color.ink900,
          background: "#fff", border: `1.5px solid ${color.border}`,
          borderRadius: radius.md, outline: "none",
          transition: "border-color .15s",
        }}
        onFocus={(e) => { e.target.style.borderColor = color.primary; e.target.style.boxShadow = `0 0 0 3px rgba(0,87,217,.1)`; }}
        onBlur={(e) => { e.target.style.borderColor = color.border; e.target.style.boxShadow = "none"; }}
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

export function LoginPage() {
  usePageMeta("Iniciar sesión", "Ingresá a tu cuenta Crow Repuestos para gestionar cotizaciones y pedidos.");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      navigate(from ?? (user.role === "ADMIN" ? "/admin" : "/cuenta"), { replace: true });
    } catch (err) {
      setError(apiError(err, "Email o contraseña incorrectos."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresá a tu cuenta para gestionar cotizaciones y pedidos."
      footer={<>¿No tenés cuenta?{" "}<Link to="/registro" style={{ color: color.primary, fontWeight: 700 }}>Crear cuenta gratis</Link></>}
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field label="Email">
          <PremiumInput
            type="email" required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
        </Field>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <label style={{ fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink800 }}>
              Contraseña
            </label>
            <Link to="/forgot-password" style={{ fontFamily: font.body, fontSize: 12.5, color: color.primary, textDecoration: "none" }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
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
              Ingresando…
            </>
          ) : "Iniciar sesión"}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthShell>
  );
}
