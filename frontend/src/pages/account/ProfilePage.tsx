import { useState, type FormEvent, type ChangeEvent } from "react";
import clsx from "clsx";
import { Field, Input, Button, Avatar, Icon } from "@/shared/ui";
import { useAuth } from "@/entities/session";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api";
import { formatDate } from "@/shared/lib/format";

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(7,17,31,.04)]">
      <div className="flex items-center gap-3 py-4 px-[22px] border-b border-border bg-surface">
        <span className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center bg-primarySoft text-primary">
          {icon}
        </span>
        <div>
          <div className="font-display text-[15px] font-bold text-ink900">
            {title}
          </div>
          {subtitle && (
            <div className="font-body text-xs text-textFaint mt-px">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="p-[22px]">
        {children}
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[3px] py-2.5 px-4 bg-[rgba(255,255,255,.08)] rounded-md border border-[rgba(255,255,255,.1)]">
      <span className="font-mono text-[9px] tracking-[.1em] uppercase text-[#7FB0FF]">
        {label}
      </span>
      <span className="font-body text-[13px] font-semibold text-white">
        {value}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const updated = await userApi.updateProfile({ full_name: fullName, phone: phone || null });
      setUser(updated);
      setStatus({ kind: "ok", msg: "Perfil actualizado correctamente." });
    } catch (err) {
      setStatus({ kind: "err", msg: apiError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-ink900 rounded-[14px] pt-7 px-7 pb-6 shadow-[0_4px_24px_rgba(7,17,31,.12)]">
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
        {/* Glow */}
        <div className="absolute -top-[60px] -right-10 w-60 h-60 rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.18)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative flex items-center gap-5">
          <Avatar name={user?.full_name ?? "?"} size={64} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-[22px] font-extrabold text-white tracking-[-.02em]">
              {user?.full_name}
            </div>
            <div className="font-mono text-[11px] text-[#7FB0FF] mt-1">
              {user?.email}
            </div>
          </div>

          <div className="flex gap-2.5 shrink-0">
            <StatChip label="Miembro desde" value={user ? formatDate(user.created_at) : "—"} />
            {user?.last_login_at && (
              <StatChip label="Último acceso" value={formatDate(user.last_login_at)} />
            )}
          </div>
        </div>
      </div>

      {/* ── Personal info form ── */}
      <SectionCard
        icon={<Icon name="users" size={17} />}
        title="Información personal"
        subtitle="Actualizá tu nombre y número de contacto"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 max-w-[480px]">
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Nombre completo">
              <Input
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                placeholder="+54 9 11 0000 0000"
              />
            </Field>
          </div>

          <Field label="Email">
            <Input
              value={user?.email ?? ""}
              disabled
              className="bg-surface text-textFaint"
            />
            <div className="font-body text-[11px] text-textFaint mt-1 flex items-center gap-1">
              <Icon name="lock" size={10} />
              El email no se puede cambiar
            </div>
          </Field>

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
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
