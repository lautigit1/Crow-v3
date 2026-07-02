import { useState, type FormEvent, type ChangeEvent } from "react";
import { Field, Input, Button, Avatar, Icon } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api/client";
import { color, font, radius } from "@/shared/config/theme";
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
          <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint, marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "22px 22px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 3,
      padding: "10px 16px",
      background: "rgba(255,255,255,.08)",
      borderRadius: radius.md,
      border: "1px solid rgba(255,255,255,.1)",
    }}>
      <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "#7FB0FF" }}>
        {label}
      </span>
      <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: "#fff" }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Hero header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: color.ink900,
        borderRadius: 14,
        padding: "28px 28px 24px",
        boxShadow: "0 4px 24px rgba(7,17,31,.12)",
      }}>
        {/* Accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)`,
        }} />
        {/* Glow */}
        <div style={{
          position: "absolute", top: -60, right: -40, width: 240, height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,87,217,.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20 }}>
          <Avatar name={user?.full_name ?? "?"} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
              {user?.full_name}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: "#7FB0FF", marginTop: 4 }}>
              {user?.email}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
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
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
              style={{ background: color.surface, color: color.textFaint }}
            />
            <div style={{ fontFamily: font.body, fontSize: 11, color: color.textFaint, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="lock" size={10} />
              El email no se puede cambiar
            </div>
          </Field>

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
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
