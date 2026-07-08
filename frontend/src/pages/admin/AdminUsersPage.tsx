import type * as React from "react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import {
  Button, DataTable, Modal, Drawer, Field, Input, Select,
  Badge, CenteredSpinner, Icon, ConfirmModal, type Column,
} from "@/shared/ui";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { AdminHeader } from "./ui/AdminHeader";
import { userApi, type User, type Role } from "@/entities/user";
import { useAuth } from "@/app/providers/AuthProvider";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { apiError } from "@/shared/api/client";
import { color } from "@/shared/config/theme";

const ROLES: Role[] = ["USER", "ADMIN"];
const ROLE_META: Record<Role, { label: string; tone: "primary" | "success" | "neutral" }> = {
  USER: { label: "Usuario", tone: "neutral" },
  ADMIN: { label: "Administrador", tone: "primary" },
};

// `size` drives width/height AND a derived font-size (`size * 0.38`), and
// `hue` is a per-name hash -- both genuinely dynamic, so the sizing/color
// values stay inline. The rest of the layout (shape, centering, font
// family/weight/color) is static and moved to Tailwind.
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-display font-extrabold text-white"
      style={{ width: size, height: size, background: `hsl(${hue},55%,42%)`, fontSize: size * 0.38 }}
    >
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
  const { confirmProps, askConfirm } = useConfirm();

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
    const ok = await askConfirm({
      title: "¿Eliminar usuario?",
      message: `¿Eliminar permanentemente a "${u.full_name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await userApi.remove(u.id);
    setDetail(null);
    await load();
  };

  const set = (patch: Partial<EditForm>) => setForm((f) => ({ ...f, ...patch }));
  const isMe = (u: User) => u.id === me?.id;

  const total = items?.length ?? 0;
  const activos = items?.filter((u) => u.is_active).length ?? 0;
  const admins = items?.filter((u) => u.role === "ADMIN").length ?? 0;

  const columns: Column<User>[] = [
    {
      header: "Usuario",
      sortKey: "full_name",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name} size={36} />
          <div className="min-w-0">
            <div className="font-bold text-ink900">
              {u.full_name}
              {isMe(u) && (
                <span className="ml-2 font-mono text-[10px] text-primary bg-primarySoft py-px px-[7px] rounded-full">VOS</span>
              )}
            </div>
            <div className="font-mono text-[11px] text-textFaint">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Rol",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Badge tone={ROLE_META[u.role].tone}>{ROLE_META[u.role].label}</Badge>
          {!isMe(u) && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {ROLES.filter((r) => r !== u.role).map((r) => (
                <button
                  key={r}
                  onClick={() => quickRole(u, r)}
                  title={`Cambiar a ${ROLE_META[r].label}`}
                  className="font-mono text-[10px] py-0.5 px-2 rounded-full border border-border bg-transparent text-textFaint cursor-pointer transition-all duration-150 hover:border-primary hover:text-primary"
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
      render: (u) => <span className="font-mono text-xs text-textFaint">{formatDate(u.created_at)}</span>,
    },
    {
      header: "Acciones",
      align: "right",
      render: (u) =>
        isMe(u) ? (
          <span className="text-textFaint text-[13px]">—</span>
        ) : (
          <div className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
              <Icon name="edit" size={14} /> Editar
            </Button>
            {/* `is_active` toggles between two fixed design tokens, but the
                override needs to reliably beat the `outline` variant's own
                text/border classes in the generated stylesheet -- Button
                already supports a `style` passthrough for exactly this, so
                it stays inline rather than fighting Tailwind's utility
                cascade order. */}
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
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Total" value={total} icon="users" />
        <StatCard label="Activos" value={activos} icon="check" tone="success" />
        <StatCard label="Inactivos" value={total - activos} icon="close" tone="danger" />
        <StatCard label="Administradores" value={admins} icon="shieldCheck" tone="primary" />
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textFaint">
            <Icon name="search" size={16} />
          </span>
          <Input
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="pl-[38px]"
          />
        </div>
        <div className="w-[170px]">
          <Select value={roleFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value as Role | "")}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </Select>
        </div>
        <div className="w-40">
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
          <div className="flex flex-col gap-5">
            {/* Avatar + badges */}
            <div className="flex items-center gap-4">
              <Avatar name={detail.full_name} size={56} />
              <div>
                <div className="flex gap-2 flex-wrap">
                  <Badge tone={ROLE_META[detail.role].tone}>{ROLE_META[detail.role].label}</Badge>
                  <Badge tone={detail.is_active ? "success" : "danger"}>{detail.is_active ? "Activo" : "Inactivo"}</Badge>
                  {isMe(detail) && <Badge tone="primary">Tu cuenta</Badge>}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-surface border border-border rounded-md p-4 flex flex-col gap-3">
              <InfoRow icon="mail" label="Email" value={detail.email} href={`mailto:${detail.email}`} />
              {detail.phone && <InfoRow icon="phone" label="Teléfono" value={detail.phone} href={`tel:${detail.phone}`} />}
              <InfoRow icon="clock" label="Registro" value={formatDateTime(detail.created_at)} />
              {detail.last_login_at && <InfoRow icon="shieldCheck" label="Último acceso" value={formatDateTime(detail.last_login_at)} />}
            </div>

            {/* Quick role change */}
            {!isMe(detail) && (
              <div>
                <div className="font-mono text-[10px] tracking-[.12em] text-textFaint uppercase mb-2.5">
                  Cambiar rol
                </div>
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => quickRole(detail, r)}
                      className={clsx(
                        "flex-1 py-2.5 px-0 rounded-md border-[1.5px] font-body text-[13px] cursor-pointer transition-all duration-150",
                        detail.role === r ? "border-primary bg-primarySoft text-primary font-bold" : "border-border bg-white text-textMuted font-normal"
                      )}
                    >
                      {ROLE_META[r].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Danger zone */}
            {!isMe(detail) && (
              <div className="border-t border-border pt-4">
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
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow="EDITAR"
        title="Usuario"
        width={600}
        footer={
          <>
            {error && <div className="font-body text-[12.5px] text-danger flex-1">{error}</div>}
            <Button type="submit" form="user-form" fullWidth disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
          </>
        }
      >
        <form id="user-form" onSubmit={save} className="flex flex-col gap-3.5">
          {/* User identity card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-white border border-border rounded-[10px]">
            {editing && <Avatar name={editing.full_name} size={44} />}
            <div>
              <div className="font-body text-sm font-bold text-ink900">{editing?.full_name}</div>
              <div className="font-mono text-[11.5px] text-textFaint">{editing?.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <label className="flex items-center gap-[9px] cursor-pointer font-body text-[13.5px] text-ink800">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="w-[15px] h-[15px] accent-primary" />
            Cuenta activa
          </label>
        </form>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// `tone` is a fixed 4-way union, so each variant's colors are precomputed
// literal Tailwind classes (same pattern as `admin/ui/StatCard`).
const USER_STAT_TONES: Record<"success" | "danger" | "primary" | "neutral", { bg: string; iconBg: string; fg: string }> = {
  success: { bg: "bg-[#F0FDF4]", iconBg: "bg-[#15803D18]", fg: "text-success" },
  danger: { bg: "bg-[#FEF2F2]", iconBg: "bg-[#DC262618]", fg: "text-danger" },
  primary: { bg: "bg-[#EFF6FF]", iconBg: "bg-[#0057D918]", fg: "text-primary" },
  neutral: { bg: "bg-surface", iconBg: "bg-[#47556918]", fg: "text-textMuted" },
};

function StatCard({ label, value, icon, tone = "neutral" }: {
  label: string; value: number;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone?: "success" | "danger" | "primary" | "neutral";
}) {
  const t = USER_STAT_TONES[tone];
  return (
    <div className={clsx("border border-border rounded-md py-3.5 px-[18px] flex items-center gap-3.5", t.bg)}>
      <div className={clsx("w-[38px] h-[38px] rounded-sm shrink-0 flex items-center justify-center", t.iconBg, t.fg)}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div className={clsx("font-display text-[22px] font-black", t.fg)}>{value}</div>
        <div className="font-mono text-[10px] text-textFaint uppercase tracking-[.07em]">{label}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, href }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string; href?: string }) {
  const inner = (
    <div className="flex items-center gap-2.5">
      <span className="text-primary shrink-0"><Icon name={icon} size={15} strokeWidth={1.8} /></span>
      <div>
        <div className="font-mono text-[10px] text-textFaint uppercase tracking-[.08em] mb-px">{label}</div>
        <div className={clsx("font-body text-[13.5px]", href ? "text-primary" : "text-ink800")}>{value}</div>
      </div>
    </div>
  );
  if (href) return <a href={href} className="no-underline">{inner}</a>;
  return <div>{inner}</div>;
}
