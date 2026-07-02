import { useState, type FormEvent, type ChangeEvent } from "react";
import { Field, Input, Button, Icon } from "@/shared/ui";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api/client";
import { color, font, radius } from "@/shared/config/theme";

// ── Password strength checker ─────────────────────────────────────────────────
type Rule = { label: string; test: (v: string) => boolean };
const RULES: Rule[] = [
  { label: "Mínimo 10 caracteres",          test: (v) => v.length >= 10 },
  { label: "Al menos una mayúscula",        test: (v) => /[A-Z]/.test(v) },
  { label: "Al menos una minúscula",        test: (v) => /[a-z]/.test(v) },
  { label: "Al menos un número",            test: (v) => /\d/.test(v) },
  { label: "Al menos un carácter especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordRules({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: font.body, fontSize: 12, color: ok ? color.success : color.textFaint }}>
            <span style={{
              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: ok ? color.successSoft : color.surface,
              border: `1px solid ${ok ? "#BBF7D0" : color.border}`,
            }}>
              {ok && <Icon name="check" size={9} />}
            </span>
            {r.label}
          </div>
        );
      })}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${color.border}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(7,17,31,.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 22px",
        borderBottom: `1px solid ${color.border}`,
        background: color.surface,
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: color.primarySoft, color: color.primary,
        }}>
          {icon}
        </span>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900 }}>{title}</div>
          {subtitle && <div style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint, marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: "22px 22px" }}>{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AccountSettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const allRulesPass = RULES.every((r) => r.test(next));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRulesPass) return;
    setLoading(true);
    setStatus(null);
    try {
      await userApi.changePassword(current, next);
      setStatus({ kind: "ok", msg: "Contraseña actualizada correctamente." });
      setCurrent("");
      setNext("");
    } catch (err) {
      setStatus({ kind: "err", msg: apiError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: color.ink900,
        borderRadius: 14,
        padding: "22px 28px",
        boxShadow: "0 4px 24px rgba(7,17,31,.12)",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)`,
        }} />
        <div style={{
          position: "absolute", top: -40, right: -20, width: 140, height: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,87,217,.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.12)",
            color: "#7FB0FF",
          }}>
            <Icon name="lock" size={20} />
          </span>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
              Configuración
            </div>
            <div style={{ fontFamily: font.body, fontSize: 12.5, color: "#94A3B8", marginTop: 3 }}>
              Administrá la seguridad de tu cuenta
            </div>
          </div>
        </div>
      </div>

      {/* ── Change password ── */}
      <SectionCard
        icon={<Icon name="lock" size={17} />}
        title="Cambiar contraseña"
        subtitle="Elegí una contraseña segura que no uses en otro sitio"
      >
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
          <Field label="Contraseña actual">
            <Input
              type="password"
              required
              value={current}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)}
              placeholder="Tu contraseña actual"
            />
          </Field>

          <div>
            <Field label="Nueva contraseña">
              <Input
                type="password"
                required
                value={next}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNext(e.target.value)}
                placeholder="Mínimo 10 caracteres"
              />
            </Field>
            <PasswordRules value={next} />
          </div>

          {status && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: radius.sm,
              background: status.kind === "ok" ? color.successSoft : color.dangerSoft,
              border: `1px solid ${status.kind === "ok" ? "#BBF7D0" : "#FECACA"}`,
              fontFamily: font.body, fontSize: 13,
              color: status.kind === "ok" ? color.success : color.danger,
            }}>
              <Icon name={status.kind === "ok" ? "check" : "alert"} size={14} />
              {status.msg}
            </div>
          )}

          <div>
            <Button type="submit" disabled={loading || (next.length > 0 && !allRulesPass)}>
              {loading ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
