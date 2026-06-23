import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, DataTable, Modal, Field, Input, CenteredSpinner, Icon, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { brandApi, type Brand, type BrandInput } from "@/entities/brand";
import { apiError } from "@/shared/api/client";
import { slugify } from "@/shared/lib/slug";
import { color, font } from "@/shared/config/theme";

const empty: BrandInput = { name: "", slug: "", logo_url: "" };

export function AdminBrandsPage() {
  const [items, setItems] = useState<Brand[] | null>(null);
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [form, setForm] = useState<BrandInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => brandApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => void load(), []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    try {
      if (editing === "new") await brandApi.create(payload);
      else if (editing) await brandApi.update(editing.id, payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Brand) => {
    if (!confirm(`¿Eliminar la marca "${b.name}"?`)) return;
    await brandApi.remove(b.id);
    await load();
  };

  const columns: Column<Brand>[] = [
    { header: "Marca", render: (b) => <strong style={{ color: color.ink900 }}>{b.name}</strong> },
    { header: "Slug", render: (b) => <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>{b.slug}</span> },
    { header: "Logo", render: (b) => (b.logo_url ? <img src={b.logo_url} alt="" style={{ height: 24 }} /> : "—") },
    {
      header: "Acciones",
      align: "right",
      render: (b) => (
        <div style={{ display: "inline-flex", gap: 8 }}>
          <Button variant="outline" size="sm" onClick={() => { setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? "" }); setEditing(b); setError(""); }}><Icon name="edit" size={14} /> Editar</Button>
          <Button variant="danger" size="sm" onClick={() => remove(b)}><Icon name="trash" size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Marcas" icon="brands" subtitle="Fabricantes y marcas aliadas." action={<Button onClick={() => { setForm(empty); setEditing("new"); setError(""); }}><Icon name="plus" size={16} /> Nueva marca</Button>} />
      {items === null ? <CenteredSpinner /> : <DataTable columns={columns} rows={items} getKey={(b) => b.id} empty="No hay marcas." />}

      <Modal open={editing !== null} onClose={() => setEditing(null)} eyebrow={editing === "new" ? "NUEVA" : "EDITAR"} title="Marca">
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Nombre">
            <Input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Slug" hint="Se autogenera si lo dejás vacío.">
            <Input value={form.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder={slugify(form.name)} />
          </Field>
          <Field label="URL del logo (opcional)">
            <Input value={form.logo_url ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" />
          </Field>
          {error && <div style={{ fontFamily: font.body, fontSize: 13, color: color.danger }}>{error}</div>}
          <Button type="submit" fullWidth disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </form>
      </Modal>
    </div>
  );
}
