import { useState, type FormEvent, type ChangeEvent } from "react";
import clsx from "clsx";
import { Field, Input, Button, Icon } from "@/shared/ui";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api";
import { AccountPageHeader } from "./ui/AccountPageHeader";

// ── Password strength checker ─────────────────────────────────────────────────
type Rule = { label: string; test: (v: string) => boolean };
const RULES: Rule[] = [
  { label: "Mínimo 10 caracteres", test: (v) => v.length >= 10 },
  { label: "Al menos una mayúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Al menos una minúscula", test: (v) => /[a-z]/.test(v) },
  { label: "Al menos un número", test: (v) => /\d/.test(v) },
  { label: "Al menos un carácter especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordRules({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2.5">
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <div key={r.label} className={clsx("flex items-center gap-[7px] font-body text-xs", ok ? "text-success" : "text-textFaint")}>
            <span className={clsx("w-4 h-4 rounded-full shrink-0 flex items-center justify-center border", ok ? "bg-successSoft border-[#BBF7D0]" : "bg-surface border-border")}>
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
    <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(7,17,31,.04)]">
      <div className="flex items-center gap-3 py-4 px-[22px] border-b border-border bg-surface">
        <span className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center bg-primarySoft text-primary">
          {icon}
        </span>
        <div>
          <div className="font-display text-[15px] font-bold text-ink900">{title}</div>
          {subtitle && <div className="font-body text-xs text-textFaint mt-px">{subtitle}</div>}
        </div>
      </div>
      <div className="p-[22px]">{children}</div>
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
    <div className="flex flex-col gap-5">

      <AccountPageHeader
        icon="lock"
        title="Configuración"
        subtitle="Administrá la seguridad de tu cuenta"
      />

      {/* ── Change password ── */}
      <SectionCard
        icon={<Icon name="lock" size={17} />}
        title="Cambiar contraseña"
        subtitle="Elegí una contraseña segura que no uses en otro sitio"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 max-w-[420px]">
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
            <div
              className={clsx(
                "flex items-center gap-2.5 py-2.5 px-3.5 rounded-sm font-body text-[13px] border",
                status.kind === "ok" ? "bg-successSoft border-[#BBF7D0] text-success" : "bg-dangerSoft border-[#FECACA] text-danger"
              )}
            >
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
