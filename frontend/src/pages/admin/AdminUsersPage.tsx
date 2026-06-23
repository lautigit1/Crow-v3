import type * as React from "react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Button, DataTable, Modal, Drawer, Field, Input, Select,
  Badge, CenteredSpinner, Icon, type Column,
} from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { userApi, type User, type Role } from "@/entities/user";
import { useAuth } from "@/app/providers/AuthProvider";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { apiError } from "@/shared/api/client";
import { color, font, radius } from "@/shared/config/theme";

const ROLES: Role[] = ["USER", "ADMIN"];
const ROLE_META: Record<Role, { label: string; tone: "primary" | "success" | "neutral" }> = {
  USER:  { label: "Usuario",        tone: "neutral"  },
  ADMIN: { label: "Administrador",  tone: "primary"  },
};

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `hsl(${hue},55%,42%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font.display, fontSize: size * 0.38, fontWeight: 800, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

type EditForm = { full_name: string; phone: string; role: Role; is_active: boolean };

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [items, setItems] = useState<User[] | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

  const [detail, setDetail] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<EditForm>({ full_name: "", phone: "", role: "USER", is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => userApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    let list = items ?? [];
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(needle));
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") list = list.filter((u) => u.is_active);
    if (statusFilter === "inactive") list = list.filter((u) => !u.is_active);
    return list;
  }, [items, q, roleFilter, statusFilter]);

  const openEdit = (u: User) => {
    setForm({ full_name: u.full_name, phone: u.phone ?? "", role: u.role, is_active: u.is_active });
    setEditing(u);
    setError("");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const updated = await userApi.update(editing.id, {
        full_name: form.full_name,
        phone: form.phone || null,
        role: form.role,
        is_active: form.is_active,
      });
      setItems((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
      if (detail?.id === updated.id) setDetail(updated);
      setEditing(null);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const quickRole = async (u: User, role: Role) => {
    const updated = await userApi.update(u.id, { role });
    setItems((prev) => prev?.map((x) => (x.id === u.id ? updated : x)) ?? null);
    if (detail?.id === u.id) setDetail(updated);
  };

  const toggleActive = async (u: User) => {
    const updated = await userApi.update(u.id, { is_active: !u.is_active });
    setItems((prev) => prev?.map((x) => (x.id === u.id ? updated : x)) ?? null);
    if (detail?.id === u.id) setDetail(updated);
  };

  const remove = async (u: User) => {
    if (!confirm(`¿Eliminar permanentemente a "${u.full_name}"?\nEsta acción no se puede deshacer.`)) return;
    await userApi.remove(u.id);
    setDetail(null);
    await load();
  };

  const set = (patch: Partial<EditForm>) => setForm((f) => ({ ...f, ...patch }));
  const isMe = (u: User) => u.id === me?.id;

  const total   = items?.length ?? 0;
  const activos = items?.filter((u) => u.is_active).length ?? 0;
  const admins  = items?.filter((u) => u.role === "ADMIN").length ?? 0;

  const columns: Column<User>[] = [
    {
      header: "Usuario",
      sortKey: "full_name",
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={u.full_name} size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: color.ink900 }}>
              {u.full_name}
              {isMe(u) && (
                <span style={{ marginLeft: 8, fontFamily: font.mono, fontSize: 10, color: color.primary, background: color.primarySoft, padding: "1px 7px", borderRadius: radius.pill }}>VOS</span>
              )}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Rol",
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge tone={ROLE_META[u.role].tone}>{ROLE_META[u.role].label}</Badge>
          {!isMe(u) && (
            <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
              {ROLES.filter((r) => r !== u.role).map((r) => (
                <button
                  key={r}
                  onClick={() => quickRole(u, r)}
                  title={`Cambiar a ${ROLE_META[r].label}`}
                  style={{
                    fontFamily: font.mono, fontSize: 10, padding: "2px 8px",
                    borderRadius: radius.pill, border: `1px solid ${color.border}`,
                    background: "transparent", color: color.textFaint, cursor: "pointer",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.primary; e.currentTarget.style.color = color.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.color = color.textFaint; }}
                >
                  → {r}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Estado",
      align: "center",
      render: (u) => <Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Activo" : "Inactivo"}</Badge>,
    },
    {
      header: "Registro",
      render: (u) => <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{formatDate(u.created_at)}</span>,
    },
    {
      header: "Acciones",
      align: "right",
      render: (u) =>
        isMe(u) ? (
          <span style={{ color: color.textFaint, fontSize: 13 }}>—</span>
        ) : (
          <div style={{ display: "inline-flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
              <Icon name="edit" size={14} /> Editar
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => toggleActive(u)}
              style={{ color: u.is_active ? color.warning : color.success, borderColor: "currentColor" }}
            >
              {u.is_active ? "Desactivar" : "Activar"}
            </Button>
            <Button variant="danger" size="sm" onClick={() => remove(u)}>
              <Icon name="trash" size={14} />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Usuarios" icon="users" subtitle={`${total} cuentas · ${admins} administradores · ${activos} activos`} />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total" value={total} icon="users" />
        <StatCard label="Activos" value={activos} icon="check" tone="success" />
        <StatCard label="Inactivos" value={total - activos} icon="close" tone="danger" />
        <StatCard label="Administradores" value={admins} icon="shieldCheck" tone="primary" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: color.textFaint }}>
            <Icon name="search" size={16} />
          </span>
          <Input
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email"
            style={{ paddingLeft: 38 }}
          />
        </div>
        <div style={{ width: 170 }}>
          <Select value={roleFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value as Role | "")}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </Select>
        </div>
        <div style={{ width: 160 }}>
          <Select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as "" | "active" | "inactive")}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
        </div>
      </div>

      {items === null ? (
        <CenteredSpinner />
      ) : (
        <DataTable columns={columns} rows={rows} getKey={(u) => u.id} empty="No hay usuarios." onRowClick={setDetail} />
      )}

      {/* Detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        eyebrow={detail ? ROLE_META[detail.role].label.toUpperCase() : ""}
        title={detail?.full_name}
        footer={detail && !isMe(detail) && (
          <>
            <Button onClick={() => openEdit(detail)} fullWidth><Icon name="edit" size={15} /> Editar usuario</Button>
            <Button variant="danger" onClick={() => remove(detail)}><Icon name="trash" size={15} /></Button>
          </>
        )}
      >
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Avatar + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={detail.full_name} size={56} />
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge tone={ROLE_META[detail.role].tone}>{ROLE_META[detail.role].label}</Badge>
                  <Badge tone={detail.is_active ? "success" : "danger"}>{detail.is_active ? "Activo" : "Inactivo"}</Badge>
                  {isMe(detail) && <Badge tone="primary">Tu cuenta</Badge>}
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: radius.md, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <InfoRow icon="mail" label="Email" value={detail.email} href={`mailto:${detail.email}`} />
              {detail.phone && <InfoRow icon="phone" label="Teléfono" value={detail.phone} href={`tel:${detail.phone}`} />}
              <InfoRow icon="clock" label="Registro" value={formatDateTime(detail.created_at)} />
              {detail.last_login_at && <InfoRow icon="shieldCheck" label="Último acceso" value={formatDateTime(detail.last_login_at)} />}
            </div>

            {/* Quick role change */}
            {!isMe(detail) && (
              <div>
                <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".12em", color: color.textFaint, textTransform: "uppercase", marginBottom: 10 }}>
                  Cambiar rol
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => quickRole(detail, r)}
                      style={{
                        flex: 1, padding: "10px 0",
                        borderRadius: radius.md,
                        border: `1.5px solid ${detail.role === r ? color.primary : color.border}`,
                        background: detail.role === r ? color.primarySoft : "#fff",
                        color: detail.role === r ? color.primary : color.textMuted,
                        fontFamily: font.body, fontSize: 13, fontWeight: detail.role === r ? 700 : 400,
                        cursor: "pointer", transition: "all .15s",
                      }}
                    >
                      {ROLE_META[r].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Danger zone */}
            {!isMe(detail) && (
              <div style={{ borderTop: `1px solid ${color.border}`, paddingTop: 16 }}>
                <Button
                  variant="outline" fullWidth
                  onClick={() => toggleActive(detail)}
                  style={{ color: detail.is_active ? color.warning : color.success, borderColor: "currentColor" }}
                >
                  {detail.is_active ? "Desactivar cuenta" : "Reactivar cuenta"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Edit modal */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} eyebrow="EDITAR" title="Usuario" width={480}>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${color.border}` }}>
            {editing && <Avatar name={editing.full_name} size={44} />}
            <div>
              <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink900 }}>{editing?.full_name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{editing?.email}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nombre completo">
              <Input required value={form.full_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ full_name: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <Input value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ phone: e.target.value })} placeholder="+54 261 …" />
            </Field>
          </div>

          <Field label="Rol">
            <Select value={form.role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label} ({r})</option>)}
            </Select>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: font.body, fontSize: 14, color: color.ink800 }}>
            <input
              type="checkbox" checked={form.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: color.primary }}
            />
            Cuenta activa
          </label>

          {error && (
            <div style={{ fontFamily: font.body, fontSize: 13, color: color.danger, padding: "10px 14px", background: color.dangerSoft, borderRadius: radius.md }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tone }: {
  label: string; value: number;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone?: "success" | "danger" | "primary";
}) {
  const iconColor = tone === "success" ? color.success : tone === "danger" ? color.danger : tone === "primary" ? color.primary : color.textMuted;
  const bg        = tone === "success" ? "#F0FDF4"    : tone === "danger" ? "#FEF2F2"    : tone === "primary" ? "#EFF6FF"    : color.surface;
  return (
    <div style={{ background: bg, border: `1px solid ${color.border}`, borderRadius: radius.md, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: radius.sm, background: `${iconColor}18`, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 900, color: iconColor }}>{value}</div>
        <div style={{ fontFamily: font.mono, fontSize: 10, color: color.textFaint, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, href }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string; href?: string }) {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: color.primary, flexShrink: 0 }}><Icon name={icon} size={15} strokeWidth={1.8} /></span>
      <div>
        <div style={{ fontFamily: font.mono, fontSize: 10, color: color.textFaint, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 1 }}>{label}</div>
        <div style={{ fontFamily: font.body, fontSize: 13.5, color: href ? color.primary : color.ink800 }}>{value}</div>
      </div>
    </div>
  );
  if (href) return <a href={href} style={{ textDecoration: "none" }}>{inner}</a>;
  return <div>{inner}</div>;
}
