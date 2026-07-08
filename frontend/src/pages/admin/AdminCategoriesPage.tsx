import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, DataTable, Modal, Input, Textarea, CenteredSpinner, Icon, ConfirmModal, type Column } from "@/shared/ui";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { AdminHeader } from "./ui/AdminHeader";
import { categoryApi, type Category, type CategoryInput } from "@/entities/category";
import { apiError } from "@/shared/api/client";
import { slugify } from "@/shared/lib/slug";

const empty: CategoryInput = { name: "", slug: "", description: "" };

const MAX_DESC = 200;

const inpCls = "h-9 text-[13px]";

export function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState<CategoryInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirmProps, askConfirm } = useConfirm();

  const load = () => categoryApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => void load(), []);

  const openNew = () => { setForm(empty); setEditing("new"); setError(""); };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "" });
    setEditing(c);
    setError("");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    try {
      if (editing === "new") await categoryApi.create(payload);
      else if (editing) await categoryApi.update(editing.id, payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    const ok = await askConfirm({
      title: "¿Eliminar categoría?",
      message: `¿Eliminar la categoría "${c.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await categoryApi.remove(c.id);
    await load();
  };

  const set = (patch: Partial<CategoryInput>) => setForm((f) => ({ ...f, ...patch }));
  const descLen = (form.description ?? "").length;

  const columns: Column<Category>[] = [
    {
      header: "Categoría",
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm shrink-0 bg-[#0057D915] flex items-center justify-center">
            <Icon name="categories" size={15} className="text-primary" />
          </div>
          <strong className="text-ink900">{c.name}</strong>
        </div>
      ),
    },
    {
      header: "Descripción",
      render: (c) => c.description
        ? <span className="text-[13px] text-textMuted">{c.description.length > 60 ? c.description.slice(0, 60) + "…" : c.description}</span>
        : <span className="text-textFaint">—</span>,
    },
    {
      header: "Acciones",
      align: "right",
      render: (c) => (
        <div className="inline-flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Icon name="edit" size={14} /> Editar</Button>
          <Button variant="danger" size="sm" onClick={() => remove(c)}><Icon name="trash" size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Categorías"
        icon="categories"
        subtitle={`${items?.length ?? 0} categorías · Líneas de producto`}
        action={<Button onClick={openNew}><Icon name="plus" size={16} /> Nueva categoría</Button>}
      />
      {items === null ? <CenteredSpinner /> : (
        <DataTable columns={columns} rows={items} getKey={(c) => c.id} empty="No hay categorías." />
      )}

      <ConfirmModal {...confirmProps} />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow={editing === "new" ? "NUEVA CATEGORÍA" : "EDITAR CATEGORÍA"}
        title="Categoría"
        width={560}
        footer={
          <div className="flex items-center gap-3 w-full">
            {error && <span className="font-body text-xs text-danger flex-1">{error}</span>}
            <Button type="submit" form="cat-form" fullWidth disabled={saving}>
              {saving ? "Guardando…" : editing === "new" ? "Crear categoría" : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <form id="cat-form" onSubmit={save} className="flex flex-col gap-3.5">

          <CompactField label="Nombre de la categoría *">
            <Input
              required
              value={form.name}
              placeholder="Ej. Frenos, Suspensión, Filtros…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })}
              className={inpCls}
            />
          </CompactField>

          <CompactField
            label="Descripción"
            right={
              <span className={`font-mono text-[9.5px] ${descLen > MAX_DESC ? "text-danger" : "text-textFaint"}`}>
                {descLen}/{MAX_DESC}
              </span>
            }
          >
            <Textarea
              rows={3}
              value={form.description ?? ""}
              placeholder="Breve descripción de qué productos incluye esta categoría…"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ description: e.target.value })}
              className="text-[13px] resize-none"
            />
          </CompactField>

          {/* Preview card */}
          {form.name && (
            <div className="rounded-md border border-border bg-[#fafafa] p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm shrink-0 bg-[#0057D915] flex items-center justify-center">
                <Icon name="categories" size={18} className="text-primary" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-ink900">{form.name}</div>
                {form.description && (
                  <div className="font-body text-xs text-textMuted mt-0.5">
                    {form.description.slice(0, 55)}{form.description.length > 55 ? "…" : ""}
                  </div>
                )}
              </div>
            </div>
          )}

        </form>
      </Modal>
    </div>
  );
}

function CompactField({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] font-bold tracking-[.12em] text-textFaint uppercase">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
