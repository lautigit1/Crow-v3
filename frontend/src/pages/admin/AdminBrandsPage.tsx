import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, DataTable, Modal, Input, CenteredSpinner, Icon, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { brandApi, type Brand, type BrandInput } from "@/entities/brand";
import { apiError } from "@/shared/api/client";
import { slugify } from "@/shared/lib/slug";
import { color, font, radius } from "@/shared/config/theme";
import { formatDateTime } from "@/shared/lib/format";

const empty: BrandInput = { name: "", slug: "", logo_url: "" };

export function AdminBrandsPage() {
  const [items, setItems] = useState<Brand[] | null>(null);
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [form, setForm] = useState<BrandInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const load = () => brandApi.list().then(setItems).catch(() => setItems([]));
  useEffect(() => void load(), []);

  const openNew = () => { setForm(empty); setEditing("new"); setError(""); setLogoError(false); };
  const openEdit = (b: Brand) => {
    setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? "" });
    setEditing(b);
    setError("");
    setLogoError(false);
  };

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

  const set = (patch: Partial<BrandInput>) => setForm((f) => ({ ...f, ...patch }));

  const columns: Column<Brand>[] = [
    {
      header: "Marca",
      render: (b) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: radius.sm, flexShrink: 0,
            border: `1px solid ${color.border}`, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {b.logo_url
              ? <img src={b.logo_url} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              : <span style={{ fontFamily: font.display, fontWeight: 900, fontSize: 13, color: color.primary }}>{b.name.slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <strong style={{ color: color.ink900 }}>{b.name}</strong>
        </div>
      ),
    },
    {
      header: "Logo",
      render: (b) => b.logo_url
        ? <span style={{ fontFamily: font.mono, fontSize: 11, color: color.primary }}>Configurado</span>
        : <span style={{ color: color.textFaint, fontSize: 13 }}>—</span>,
    },
    {
      header: "Creada",
      render: (b) => <span style={{ fontSize: 13, color: color.textMuted }}>{formatDateTime(b.created_at)}</span>,
    },
    {
      header: "Acciones",
      align: "right",
      render: (b) => (
        <div style={{ display: "inline-flex", gap: 8 }}>
          <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Icon name="edit" size={14} /> Editar</Button>
          <Button variant="danger" size="sm" onClick={() => remove(b)}><Icon name="trash" size={14} /></Button>
        </div>
      ),
    },
  ];

  const hasLogo = !!form.logo_url && !logoError;

  return (
    <div>
      <AdminHeader
        title="Marcas"
        icon="brands"
        subtitle={`${items?.length ?? 0} marcas registradas`}
        action={<Button onClick={openNew}><Icon name="plus" size={16} /> Nueva marca</Button>}
      />
      {items === null ? <CenteredSpinner /> : (
        <DataTable columns={columns} rows={items} getKey={(b) => b.id} empty="No hay marcas registradas." />
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow={editing === "new" ? "NUEVA MARCA" : "EDITAR MARCA"}
        title="Marca"
        width={440}
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            {error && <span style={{ fontFamily: font.body, fontSize: 12, color: color.danger, flex: 1 }}>{error}</span>}
            <Button type="submit" form="brand-form" fullWidth disabled={saving}>
              {saving ? "Guardando…" : editing === "new" ? "Crear marca" : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <form id="brand-form" onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <CompactField label="Nombre de la marca *">
            <Input
              required
              value={form.name}
              placeholder="Ej. Bosch, NGK, Monroe…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })}
              style={inp}
            />
          </CompactField>

          <CompactField label="URL del logo (opcional)">
            <Input
              value={form.logo_url ?? ""}
              placeholder="https://ejemplo.com/logo.png"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { set({ logo_url: e.target.value }); setLogoError(false); }}
              style={inp}
            />
          </CompactField>

          {/* Logo preview */}
          {form.logo_url && (
            <div style={{
              borderRadius: radius.md,
              border: `1px solid ${color.border}`,
              background: "#fafafa",
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 64, height: 48, borderRadius: radius.sm,
                border: `1px solid ${color.border}`, background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
              }}>
                {hasLogo
                  ? <img src={form.logo_url} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={() => setLogoError(true)} />
                  : <Icon name="image" size={20} style={{ color: color.textFaint }} />
                }
              </div>
              <div>
                <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase", marginBottom: 3 }}>Vista previa</div>
                <div style={{ fontFamily: font.body, fontSize: 12.5, color: logoError ? color.danger : color.textMuted }}>
                  {logoError ? "No se pudo cargar la imagen" : "Logo cargado correctamente"}
                </div>
              </div>
            </div>
          )}

        </form>
      </Modal>
    </div>
  );
}

const inp: React.CSSProperties = { height: 36, fontSize: 13 };

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: font.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", color: color.textFaint, textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );
}
