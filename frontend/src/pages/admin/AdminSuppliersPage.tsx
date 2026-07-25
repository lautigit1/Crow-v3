import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import {
  Button, DataTable, Modal, Drawer, Field, Input, Textarea,
  Badge, CenteredSpinner, Icon, Pagination, ConfirmModal, type Column, type SortState,
} from "@/shared/ui";
import { useConfirm } from "@/shared/lib/useConfirm";
import { AdminHeader } from "./ui/AdminHeader";
import { supplierApi, type Supplier, type SupplierInput } from "@/entities/supplier";
import { apiError } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format";
import { color } from "@/shared/config";

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
  const [loadError, setLoadError] = useState(false);
  const { confirmProps, askConfirm } = useConfirm();

  const reload = () => {
    setItems(null);
    setLoadError(false);
    return supplierApi
      .list({ q: q || undefined, active_only: activeOnly || undefined, skip: page * PAGE, limit: PAGE })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch((err) => {
        console.error("[AdminSuppliersPage] no se pudieron cargar los proveedores:", err);
        setItems([]);
        setTotal(0);
        setLoadError(true);
      });
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
          <div className="font-bold text-ink900">{s.name}</div>
          {s.contact_name && (
            <div className="text-xs text-textMuted">{s.contact_name}</div>
          )}
        </div>
      ),
    },
    {
      header: "Contacto",
      render: (s) => (
        <div className="flex flex-col gap-0.5">
          {s.phone && (
            <a href={`tel:${s.phone}`} className="text-[13px] text-primary no-underline"
              onClick={(e) => e.stopPropagation()}>
              {s.phone}
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className="text-xs text-textMuted no-underline"
              onClick={(e) => e.stopPropagation()}>
              {s.email}
            </a>
          )}
          {!s.phone && !s.email && <span className="text-textFaint text-[13px]">—</span>}
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
        <div className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
            <Icon name="edit" size={14} /> Editar
          </Button>
          {/* See AdminUsersPage: this toggle needs a reliable override of the
              `outline` variant's own text/border classes, so it keeps the
              `style` passthrough Button already supports. */}
          <Button
            variant="outline" size="sm"
            onClick={() => toggleActive(s)}
            style={{ color: s.is_active ? color.warning : color.success, borderColor: "currentColor" }}
          >
            {s.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button variant="danger" size="sm" onClick={() => remove(s)} aria-label="Eliminar proveedor">
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total" value={total} icon="users" />
        <SummaryCard label="Activos" value={items?.filter((s) => s.is_active).length ?? 0} icon="check" tone="success" />
        <SummaryCard label="Inactivos" value={items?.filter((s) => !s.is_active).length ?? 0} icon="close" tone="neutral" />
        <SummaryCard label="Con productos" value={items?.filter((s) => s.product_count > 0).length ?? 0} icon="box" tone="primary" />
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textFaint">
            <Icon name="search" size={16} />
          </span>
          <Input
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => resetTo0(setQ)(e.target.value)}
            placeholder="Buscar por nombre, contacto o ciudad"
            className="pl-[38px]"
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
            empty={loadError ? "No se pudieron cargar los proveedores. Recargá la página." : "No hay proveedores registrados."}
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
              <Button variant="danger" onClick={() => remove(detail)} aria-label="Eliminar proveedor"><Icon name="trash" size={15} /></Button>
            </>
          )
        }
      >
        {detail && (
          <div className="flex flex-col gap-5">
            {/* Status badge */}
            <div className="flex gap-2">
              <Badge tone={detail.is_active ? "success" : "neutral"}>{detail.is_active ? "Activo" : "Inactivo"}</Badge>
              <Badge tone="primary">{detail.product_count} productos</Badge>
            </div>

            {/* Contact card */}
            <div className="bg-surface border border-border rounded-md p-4 flex flex-col gap-2.5">
              <div className="font-mono text-[10px] tracking-[.1em] text-textFaint uppercase mb-1">Contacto</div>
              {detail.contact_name && <ContactRow icon="users" value={detail.contact_name} />}
              {detail.phone && (
                <a href={`tel:${detail.phone}`} className="no-underline">
                  <ContactRow icon="phone" value={detail.phone} clickable />
                </a>
              )}
              {detail.email && (
                <a href={`mailto:${detail.email}`} className="no-underline">
                  <ContactRow icon="mail" value={detail.email} clickable />
                </a>
              )}
              {detail.city && <ContactRow icon="mapPin" value={detail.city} />}
              {!detail.contact_name && !detail.phone && !detail.email && !detail.city && (
                <span className="text-textFaint text-[13px]">Sin datos de contacto</span>
              )}
            </div>

            {/* Notes */}
            {detail.notes && (
              <div>
                <div className="font-mono text-[10px] tracking-[.1em] text-textFaint uppercase mb-2">Notas</div>
                <p className="font-body text-sm leading-[1.6] text-ink800 m-0">{detail.notes}</p>
              </div>
            )}

            {/* Meta */}
            <div className="border-t border-border pt-3.5 grid grid-cols-2 gap-3">
              <DrawerDetail label="Creado" value={formatDateTime(detail.created_at)} />
              <DrawerDetail label="Actualizado" value={formatDateTime(detail.updated_at)} />
            </div>

            {/* Danger zone */}
            <div className="border-t border-border pt-3.5">
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
        width={640}
        footer={
          <>
            {error && <div className="font-body text-[12.5px] text-danger flex-1">{error}</div>}
            <Button type="submit" form="supplier-form" fullWidth disabled={saving}>
              {saving ? "Guardando…" : editing === "new" ? "Crear proveedor" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        {/* gap-5 entre campos y gap-4 dentro de cada fila: con etiquetas en
            sentence case el bloque etiqueta+campo se lee como una unidad, así
            que necesita más aire alrededor para no fundirse con el siguiente
            (antes: gap-3 uniforme, que con mayúsculas espaciadas disimulaba
            el problema). */}
        <form id="supplier-form" onSubmit={save} className="flex flex-col gap-5">
          <Field label="Nombre del proveedor *">
            <Input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })} placeholder="Ej. Distribuidora del Sur S.A." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Persona de contacto">
              <Input value={form.contact_name ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ contact_name: e.target.value })} placeholder="Nombre y apellido" />
            </Field>
            <Field label="Ciudad">
              <Input value={form.city ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ city: e.target.value })} placeholder="Ej. Mendoza" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
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

          {/* El checkbox pasa de una línea suelta al pie del formulario a una
              fila propia con fondo y borde: es la única opción del modal que
              no es un campo de texto, y como decisión (activo / inactivo)
              merece leerse aparte y no como un renglón más. */}
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-borderStrong">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
              className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-body text-[13.5px] font-semibold leading-none text-ink800">Proveedor activo</span>
              <span className="font-body text-[12px] leading-snug text-textFaint">
                Los inactivos no aparecen al asignar proveedor a un producto.
              </span>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// `tone` is a fixed 3-way union -- precomputed literal classes, same pattern
// as the other admin summary/stat cards in this phase.
const SUMMARY_TONES: Record<"success" | "primary" | "neutral", { bg: string; iconBg: string; fg: string }> = {
  success: { bg: "bg-[#F0FDF4]", iconBg: "bg-[#15803D18]", fg: "text-[#15803D]" },
  primary: { bg: "bg-[#EFF6FF]", iconBg: "bg-[#1D4ED818]", fg: "text-[#1D4ED8]" },
  neutral: { bg: "bg-surface", iconBg: "bg-[#47556918]", fg: "text-textMuted" },
};

function SummaryCard({
  label, value, icon, tone = "neutral",
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone?: "success" | "neutral" | "primary";
}) {
  const t = SUMMARY_TONES[tone];
  const valColor = tone === "neutral" ? "text-ink900" : t.fg;
  return (
    <div className={clsx("border border-border rounded-md py-3.5 px-[18px] flex items-center gap-3.5", t.bg)}>
      <div className={clsx("w-10 h-10 rounded-sm shrink-0 flex items-center justify-center", t.iconBg, t.fg)}>
        <Icon name={icon} size={20} strokeWidth={1.8} />
      </div>
      <div>
        <div className={clsx("font-display text-[22px] font-black", valColor)}>{value}</div>
        <div className="font-mono text-[11px] text-textFaint uppercase tracking-[.07em]">{label}</div>
      </div>
    </div>
  );
}

function ContactRow({ icon, value, clickable }: { icon: React.ComponentProps<typeof Icon>["name"]; value: string; clickable?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={clsx("shrink-0", clickable ? "text-primary" : "text-textMuted")}>
        <Icon name={icon} size={15} strokeWidth={1.8} />
      </span>
      <span className={clsx("font-body text-[13.5px]", clickable ? "text-primary" : "text-ink800")}>{value}</span>
    </div>
  );
}

function DrawerDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.06em] text-textFaint uppercase mb-1">{label}</div>
      <div className="font-body text-[13px] text-ink900">{value}</div>
    </div>
  );
}
