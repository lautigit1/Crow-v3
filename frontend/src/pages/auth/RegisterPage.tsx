import type * as React from "react";
import { useState, type FormEvent } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "./AuthShell";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiError } from "@/shared/api/client";
import { color, font, radius } from "@/shared/config/theme";

function PremiumInput({ type = "text", value, onChange, placeholder, required, minLength }: {
  type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} required={required} minLength={minLength}
      value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: "100%", boxSizing: "border-box",
        height: 44, padding: "0 14px",
        fontFamily: font.body, fontSize: 14, color: color.ink900,
        background: color.surface, border: `1.5px solid ${focused ? color.primary : color.border}`,
        borderRadius: radius.md, outline: "none",
        boxShadow: focused ? `0 0 0 3px rgba(0,87,217,.1)` : "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
    />
  );
}

function PasswordInput({ value, onChange }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  // Strength meter
  const strength = (() => {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 10) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  })();
  const strengthLabel = ["", "Débil", "Regular", "Buena", "Fuerte"][strength];
  const strengthColor = ["", color.danger, "#D97706", "#0891B2", color.success][strength];

  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          required minLength={10}
          value={value} onChange={onChange}
          placeholder="Mínimo 10 caracteres"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box",
            height: 44, padding: "0 44px 0 14px",
            fontFamily: font.body, fontSize: 14, color: color.ink900,
            background: "#fff", border: `1.5px solid ${focused ? color.primary : color.border}`,
            borderRadius: radius.md, outline: "none", transition: "border-color .15s",
          }}
        />
        <button
          type="button" onClick={() => setShow((s) => !s)}
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
      {/* Strength bar */}
      {value && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, display: "flex", gap: 3 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 99,
                background: i <= strength ? strengthColor : color.border,
                transition: "background .2s",
              }} />
            ))}
          </div>
          <span style={{ fontFamily: font.mono, fontSize: 11, color: strengthColor, minWidth: 48 }}>{strengthLabel}</span>
        </div>
      )}
      {value && strength < 3 && (
        <p style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint, margin: "6px 0 0" }}>
          Usá mayúsculas, números y símbolos para una contraseña más segura.
        </p>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink800, display: "block", marginBottom: 6 }}>
      {children}
    </label>
  );
}

export function RegisterPage() {
  usePageMeta("Crear cuenta", "Registrate gratis en Crow Repuestos y empezá a cotizar repuestos en minutos.");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone || undefined });
      navigate("/cuenta", { replace: true });
    } catch (err) {
      setError(apiError(err, "No pudimos crear tu cuenta."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Crear tu cuenta"
      subtitle="Registrate gratis y empezá a cotizar en minutos."
      footer={<>¿Ya tenés cuenta?{" "}<Link to="/login" style={{ color: color.primary, fontWeight: 700 }}>Iniciar sesión</Link></>}
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <Label>Nombre completo</Label>
            <PremiumInput required value={form.full_name} onChange={set("full_name")} placeholder="Tu nombre" />
          </div>
          <div>
            <Label>Teléfono <span style={{ color: color.textFaint, fontWeight: 400 }}>(opcional)</span></Label>
            <PremiumInput value={form.phone} onChange={set("phone")} placeholder="+54 261 …" />
          </div>
        </div>

        <div>
          <Label>Email</Label>
          <PremiumInput type="email" required value={form.email} onChange={set("email")} placeholder="tu@correo.com" />
        </div>

        <div>
          <Label>Contraseña</Label>
          <PasswordInput value={form.password} onChange={set("password")} />
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

        {/* Terms notice */}
        <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.textFaint, margin: 0, lineHeight: 1.6 }}>
          Al registrarte aceptás nuestros{" "}
          <Link to="/legal/terminos" style={{ color: color.primary }}>Términos y condiciones</Link>
          {" "}y la{" "}
          <Link to="/legal/privacidad" style={{ color: color.primary }}>Política de privacidad</Link>.
        </p>

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
            transition: "background .15s", letterSpacing: "-.01em",
          }}
        >
          {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthShell>
  );
}
