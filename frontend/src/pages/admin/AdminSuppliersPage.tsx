import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button, DataTable, Modal, Drawer, Field, Input, Textarea,
  Badge, CenteredSpinner, Icon, Pagination, ConfirmModal, type Column, type SortState,
} from "@/shared/ui";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { AdminHeader } from "./ui/AdminHeader";
import { supplierApi, type Supplier, type SupplierInput } from "@/entities/supplier";
import { apiError } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { color, font, radius } from "@/shared/config/theme";

const PAGE = 15;

const empty: SupplierInput = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  city: "",
  notes: "",
  is_active: true,
};

export function AdminSuppliersPage() {
  const [items, setItems] = useState<Supplier[] | null>(null);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sort, setSort] = useState<SortState>();
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [form, setForm] = useState<SupplierInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Supplier | null>(null);
  const { confirmProps, askConfirm } = useConfirm();

  const reload = () => {
    setItems(null);
    return supplierApi
      .list({ q: q || undefined, active_only: activeOnly || undefined, skip: page * PAGE, limit: PAGE })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => { setItems([]); setTotal(0); });
  };

  useEffect(() => {
    const h = setTimeout(reload, 200);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeOnly, page]);

  const resetTo0 = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };

  const sortedItems = (() => {
    if (!items || !sort) return items ?? [];
    return [...items].sort((a, b) => {
      let va = (a as Record<string, unknown>)[sort.key] ?? "";
      let vb = (b as Record<string, unknown>)[sort.key] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  })();

  const onSort = (key: string) =>
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const openNew = () => { setForm(empty); setEditing("new"); setError(""); };
  const openEdit = (s: Supplier) => {
    setForm({
      name: s.name, contact_name: s.contact_name ?? "", phone: s.phone ?? "",
      email: s.email ?? "", city: s.city ?? "", notes: s.notes ?? "", is_active: s.is_active,
    });
    setEditing(s);
    setError("");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        notes: form.notes || null,
      };
      if (editing === "new") await supplierApi.create(payload);
      else if (editing) await supplierApi.update(editing.id, payload);
      setEditing(null);
      setDetail(null);
      await reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Supplier) => {
    const ok = await askConfirm({
      title: "¿Eliminar proveedor?",
      message: `¿Eliminar "${s.name}"? Los productos vinculados quedarán sin proveedor asignado.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await supplierApi.remove(s.id);
    setDetail(null);
    await reload();
  };

  const toggleActive = async (s: Supplier) => {
    await supplierApi.update(s.id, { is_active: !s.is_active });
    await reload();
    if (detail?.id === s.id) setDetail((d) => d ? { ...d, is_active: !d.is_active } : d);
  };

  const set = (patch: Partial<SupplierInput>) => setForm((f) => ({ ...f, ...patch }));

  const columns: Column<Supplier>[] = [
    {
      header: "Proveedor",
      sortKey: "name",
      render: (s) => (
        <div>
          <div style={{ fontWeight: 700, color: color.ink900 }}>{s.name}</div>
          {s.contact_name && (
            <div style={{ fontSize: 12, color: color.textMuted }}>{s.contact_name}</div>
          )}
        </div>
      ),
    },
    {
      header: "Contacto",
      render: (s) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {s.phone && (
            <a href={`tel:${s.phone}`} style={{ fontSize: 13, color: color.primary, textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}>
              {s.phone}
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} style={{ fontSize: 12, color: color.textMuted, textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}>
              {s.email}
            </a>
          )}
          {!s.phone && !s.email && <span style={{ color: color.textFaint, fontSize: 13 }}>—</span>}
        </div>
      ),
    },
    { header: "Ciudad", sortKey: "city", render: (s) => s.city ?? "—" },
    {
      header: "Productos",
      align: "center",
      sortKey: "product_count",
      render: (s) => (
        <Badge tone={s.product_count > 0 ? "primary" : "neutral"}>{s.product_count}</Badge>
      ),
    },
    {
      header: "Estado",
      align: "center",
      sortKey: "is_active",
      render: (s) => (
        <Badge tone={s.is_active ? "success" : "neutral"}>
          {s.is_active ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      align: "right",
      render: (s) => (
        <div style={{ display: "inline-flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
            <Icon name="edit" size={14} /> Editar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => toggleActive(s)}
            style={{ color: s.is_active ? color.warning : color.success, borderColor: "currentColor" }}
          >
            {s.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button variant="danger" size="sm" onClick={() => remove(s)}>
            <Icon name="trash" size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = items?.filter((s) => s.is_active).length ?? 0;

  return (
    <div>
      <AdminHeader
        title="Proveedores"
        icon="brands"
        subtitle={`${total} proveedores registrados · ${activeCount} activos`}
        action={<Button onClick={openNew}><Icon name="plus" size={16} /> Nuevo proveedor</Button>}
      />

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <SummaryCard label="Total" value={total} icon="users" />
        <SummaryCard label="Activos" value={items?.filter((s) => s.is_active).length ?? 0} icon="check" tone="success" />
        <SummaryCard label="Inactivos" value={items?.filter((s) => !s.is_active).length ?? 0} icon="close" tone="neutral" />
        <SummaryCard label="Con productos" value={items?.filter((s) => s.product_count > 0).length ?? 0} icon="box" tone="primary" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: color.textFaint }}>
            <Icon name="search" size={16} />
          </span>
          <Input
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => resetTo0(setQ)(e.target.value)}
            placeholder="Buscar por nombre, contacto o ciudad"
            style={{ paddingLeft: 38 }}
          />
        </div>
        <Button
          variant={activeOnly ? "primary" : "outline"}
          onClick={() => resetTo0(setActiveOnly)(!activeOnly)}
        >
          <Icon name="check" size={16} /> Solo activos
        </Button>
      </div>

      {items === null ? (
        <CenteredSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={sortedItems}
            getKey={(s) => s.id}
            empty="No hay proveedores registrados."
            sort={sort}
            onSort={onSort}
            onRowClick={setDetail}
          />
          <Pagination page={page} pageSize={PAGE} total={total} onPage={setPage} />
        </>
      )}

      {/* Detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        eyebrow={detail?.city ?? "PROVEEDOR"}
        title={detail?.name}
        footer={
          detail && (
            <>
              <Button onClick={() => openEdit(detail)} fullWidth><Icon name="edit" size={15} /> Editar</Button>
              <Button variant="danger" onClick={() => remove(detail)}><Icon name="trash" size={15} /></Button>
            </>
          )
        }
      >
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Status badge */}
            <div style={{ display: "flex", gap: 8 }}>
              <Badge tone={detail.is_active ? "success" : "neutral"}>{detail.is_active ? "Activo" : "Inactivo"}</Badge>
              <Badge tone="primary">{detail.product_count} productos</Badge>
            </div>

            {/* Contact card */}
            <div style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: radius.md, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase", marginBottom: 4 }}>Contacto</div>
              {detail.contact_name && <ContactRow icon="users" value={detail.contact_name} />}
              {detail.phone && (
                <a href={`tel:${detail.phone}`} style={{ textDecoration: "none" }}>
                  <ContactRow icon="phone" value={detail.phone} clickable />
                </a>
              )}
              {detail.email && (
                <a href={`mailto:${detail.email}`} style={{ textDecoration: "none" }}>
                  <ContactRow icon="mail" value={detail.email} clickable />
                </a>
              )}
              {detail.city && <ContactRow icon="mapPin" value={detail.city} />}
              {!detail.contact_name && !detail.phone && !detail.email && !detail.city && (
                <span style={{ color: color.textFaint, fontSize: 13 }}>Sin datos de contacto</span>
              )}
            </div>

            {/* Notes */}
            {detail.notes && (
              <div>
                <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase", marginBottom: 8 }}>Notas</div>
                <p style={{ fontFamily: font.body, fontSize: 14, lineHeight: 1.6, color: color.ink800, margin: 0 }}>{detail.notes}</p>
              </div>
            )}

            {/* Meta */}
            <div style={{ borderTop: `1px solid ${color.border}`, paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <DrawerDetail label="Creado" value={formatDateTime(detail.created_at)} />
              <DrawerDetail label="Actualizado" value={formatDateTime(detail.updated_at)} />
            </div>

            {/* Danger zone */}
            <div style={{ borderTop: `1px solid ${color.border}`, paddingTop: 14 }}>
              <Button
                variant="outline"
                fullWidth
                onClick={() => toggleActive(detail)}
                style={{ color: detail.is_active ? color.warning : color.success, borderColor: "currentColor" }}
              >
                {detail.is_active ? "Desactivar proveedor" : "Reactivar proveedor"}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create / edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow={editing === "new" ? "NUEVO" : "EDITAR"}
        title="Proveedor"
        width={520}
        footer={
          <>
            {error && <div style={{ fontFamily: font.body, fontSize: 12.5, color: color.danger, flex: 1 }}>{error}</div>}
            <Button type="submit" form="supplier-form" fullWidth disabled={saving}>
              {saving ? "Guardando…" : editing === "new" ? "Crear proveedor" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nombre del proveedor *">
            <Input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })} placeholder="Ej. Distribuidora del Sur S.A." />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Persona de contacto">
              <Input value={form.contact_name ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ contact_name: e.target.value })} placeholder="Nombre y apellido" />
            </Field>
            <Field label="Ciudad">
              <Input value={form.city ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ city: e.target.value })} placeholder="Ej. Mendoza" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Teléfono">
              <Input type="tel" value={form.phone ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ phone: e.target.value })} placeholder="+54 261 …" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ email: e.target.value })} placeholder="ventas@proveedor.com" />
            </Field>
          </div>
          <Field label="Notas internas">
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ notes: e.target.value })} placeholder="Condiciones comerciales, tiempos de entrega, observaciones…" />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontFamily: font.body, fontSize: 13.5, color: color.ink800 }}>
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => set({ is_active: e.target.checked })} style={{ width: 15, height: 15, accentColor: color.primary }} />
            Proveedor activo
          </label>
        </form>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon, tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone?: "success" | "neutral" | "primary";
}) {
  const bg = tone === "success" ? "#F0FDF4" : tone === "primary" ? "#EFF6FF" : color.surface;
  const iconColor = tone === "success" ? "#15803D" : tone === "primary" ? "#1D4ED8" : color.textMuted;
  const valColor = tone === "success" ? "#15803D" : tone === "primary" ? "#1D4ED8" : color.ink900;
  return (
    <div style={{ background: bg, border: `1px solid ${color.border}`, borderRadius: radius.md, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: radius.sm, background: `${iconColor}18`, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>
        <Icon name={icon} size={20} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 900, color: valColor }}>{value}</div>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</div>
      </div>
    </div>
  );
}

function ContactRow({ icon, value, clickable }: { icon: React.ComponentProps<typeof Icon>["name"]; value: string; clickable?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: clickable ? color.primary : color.textMuted, flexShrink: 0 }}>
        <Icon name={icon} size={15} strokeWidth={1.8} />
      </span>
      <span style={{ fontFamily: font.body, fontSize: 13.5, color: clickable ? color.primary : color.ink800 }}>{value}</span>
    </div>
  );
}

function DrawerDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".06em", color: color.textFaint, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: font.body, fontSize: 13, color: color.ink900 }}>{val