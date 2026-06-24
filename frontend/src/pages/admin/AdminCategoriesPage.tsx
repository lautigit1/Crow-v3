import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, DataTable, Modal, Input, Textarea, CenteredSpinner, Icon, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { categoryApi, type Category, type CategoryInput } from "@/entities/category";
import { apiError } from "@/shared/api/client";
import { slugify } from "@/shared/lib/slug";
import { color, font, radius } from "@/shared/config/theme";

const empty: CategoryInput = { name: "", slug: "", description: "" };

const MAX_DESC = 200;

export function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState<CategoryInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    await categoryApi.remove(c.id);
    await load();
  };

  const set = (patch: Partial<CategoryInput>) => setForm((f) => ({ ...f, ...patch }));
  const descLen = (form.description ?? "").length;

  const columns: Column<Category>[] = [
    {
      header: "Categoría",
      render: (c) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: radius.sm, flexShrink: 0,
            background: `${color.primary}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="categories" size={15} style={{ color: color.primary }} />
          </div>
          <strong style={{ color: color.ink900 }}>{c.name}</strong>
        </div>
      ),
    },
    {
      header: "Descripción",
      render: (c) => c.description
        ? <span style={{ fontSize: 13, color: color.textMuted }}>{c.description.length > 60 ? c.description.slice(0, 60) + "…" : c.description}</span>
        : <span style={{ color: color.textFaint }}>—</span>,
    },
    {
      header: "Acciones",
      align: "right",
      render: (c) => (
        <div style={{ display: "inline-flex", gap: 8 }}>
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

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow={editing === "new" ? "NUEVA CATEGORÍA" : "EDITAR CATEGORÍA"}
        title="Categoría"
        width={440}
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            {error && <span style={{ fontFamily: font.body, fontSize: 12, color: color.danger, flex: 1 }}>{error}</span>}
            <Button type="submit" form="cat-form" fullWidth disabled={saving}>
              {saving ? "Guardando…" : editing === "new" ? "Crear categoría" : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <form id="cat-form" onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <CompactField label="Nombre de la categoría *">
            <Input
              required
              value={form.name}
              placeholder="Ej. Frenos, Suspensión, Filtros…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })}
              style={inp}
            />
          </CompactField>

          <CompactField
            label="Descripción"
            right={
              <span style={{ fontFamily: font.mono, fontSize: 9.5, color: descLen > MAX_DESC ? color.danger : color.textFaint }}>
                {descLen}/{MAX_DESC}
              </span>
            }
          >
            <Textarea
              rows={3}
              value={form.description ?? ""}
              placeholder="Breve descripción de qué productos incluye esta categoría…"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ description: e.target.value })}
              style={{ fontSize: 13, resize: "none" }}
            />
          </CompactField>

          {/* Preview card */}
          {form.name && (
            <div style={{
              borderRadius: radius.md,
              border: `1px solid ${color.border}`,
              background: "#fafafa",
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: radius.sm, flexShrink: 0,
                background: `${color.primary}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="categories" size={18} style={{ color: color.primary }} />
              </div>
              <div>
                <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14, color: color.ink900 }}>{form.name}</div>
                {form.description && (
                  <div style={{ fontFamily: font.body, fontSize: 12, color: color.textMuted, marginTop: 2 }}>
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

const inp: React.CSSProperties = { height: 36, fontSize: 13 };

function CompactField({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: font.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", color: color.textFaint, textTransform: "uppercase" }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
