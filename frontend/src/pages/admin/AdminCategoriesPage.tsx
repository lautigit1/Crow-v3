import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, DataTable, Modal, Field, Input, Textarea, CenteredSpinner, Icon, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { categoryApi, type Category, type CategoryInput } from "@/entities/category";
import { apiError } from "@/shared/api/client";
import { slugify } from "@/shared/lib/slug";
import { color, font } from "@/shared/config/theme";

const empty: CategoryInput = { name: "", slug: "", description: "" };

export function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState<CategoryInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => categoryApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => void load(), []);

  const openNew = () => {
    setForm(empty);
    setEditing("new");
    setError("");
  };
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

  const columns: Column<Category>[] = [
    { header: "Nombre", render: (c) => <strong style={{ color: color.ink900 }}>{c.name}</strong> },
    { header: "Slug", render: (c) => <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{c.slug}</span> },
    { header: "Descripción", render: (c) => c.description ?? "—" },
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
      <AdminHeader title="Categorías" icon="categories" subtitle="Gestioná las líneas de producto." action={<Button onClick={openNew}><Icon name="plus" size={16} /> Nueva categoría</Button>} />
      {items === null ? <CenteredSpinner /> : <DataTable columns={columns} rows={items} getKey={(c) => c.id} empty="No hay categorías." />}

      <Modal open={editing !== null} onClose={() => setEditing(null)} eyebrow={editing === "new" ? "NUEVA" : "EDITAR"} title="Categoría">
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Nombre">
            <Input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Slug" hint="Se autogenera del nombre si lo dejás vacío.">
            <Input value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder={slugify(form.name)} />
          </Field>
          <Field label="Descripción">
            <Textarea rows={2} value={form.description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          {error && <div style={{ fontFamily: font.body, fontSize: 13, color: color.danger }}>{error}</div>}
          <Button type="submit" fullWidth disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </form>
      </Modal>
    </div>
  );
}
