import { useState, type FormEvent, type ChangeEvent } from "react";
import clsx from "clsx";
import { Field, Input, Button, Avatar, Icon } from "@/shared/ui";
import { useAuth } from "@/entities/session";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api";
import { formatDate } from "@/shared/lib/format";
import { AccountStat } from "./ui/AccountPageHeader";

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
      <div className="flex items-center gap-3.5 border-b border-border bg-surface px-6 py-[18px]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primarySoft text-primary">
          {icon}
        </span>
        <div>
          <h2 className="m-0 font-display text-[16px] font-extrabold tracking-[-.02em] text-ink900">
            {title}
          </h2>
          {subtitle && (
            /* 12px → 13px y `textMuted` en vez de `textFaint`: el subtítulo
               explica qué hace la sección, no es una nota al pie. */
            <p className="m-0 mt-0.5 font-body text-[13px] leading-snug text-textMuted">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
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

      {/* ── Hero header ──
          Mantiene el avatar (es la única página donde la identidad es el
          tema, no el contexto) pero comparte los colores y el espaciado con
          `AccountPageHeader`, que ahora usan las otras cuatro páginas. */}
      <div className="relative overflow-hidden rounded-[14px] bg-ink900 px-7 py-6 shadow-[0_4px_24px_rgba(7,17,31,.1)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
        <div className="pointer-events-none absolute -right-10 -top-16 h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.1)_0%,transparent_70%)]" />

        <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={user?.full_name ?? "?"} size={60} />
            <div className="min-w-0">
              <h1 className="m-0 font-display text-[22px] font-black leading-tight tracking-[-.025em] text-white">
                {user?.full_name}
              </h1>
              {/* Fira Mono 11px pasa a DM Sans 13.5px sobre #8AA3BC: un mail
                  es una cadena que se lee, no un dato tabular que se compara
                  columna por columna, que es para lo que sirve una mono. */}
              <p className="m-0 mt-1 truncate font-body text-[13.5px] leading-snug text-[#8AA3BC]" title={user?.email}>
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2.5">
            <AccountStat label="Miembro desde" value={user ? formatDate(user.created_at) : "—"} />
            {user?.last_login_at && (
              <AccountStat label="Último acceso" value={formatDate(user.last_login_at)} />
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
        {/* 640px en vez de 480: con los campos a la mitad del ancho, la
            tarjeta quedaba con un tercio vacío a la derecha y el formulario
            leía como si le faltara algo. `sm:grid-cols-2` además evita que
            las dos columnas se aplasten en un teléfono. */}
        <form onSubmit={submit} className="flex max-w-[640px] flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
              className="cursor-not-allowed bg-surface text-textFaint"
            />
            {/* El aviso estaba a 11px, más chico que cualquier otro texto de
                la página: leía como letra chica de contrato justo donde hace
                falta que se entienda por qué el campo no responde. */}
            <div className="mt-0.5 flex items-center gap-1.5 font-body text-[12px] text-textFaint">
              <Icon name="lock" size={12} />
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
