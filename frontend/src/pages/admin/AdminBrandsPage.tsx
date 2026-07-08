import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, DataTable, Modal, Input, CenteredSpinner, Icon, ConfirmModal, type Column } from "@/shared/ui";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { AdminHeader } from "./ui/AdminHeader";
import { brandApi, type Brand, type BrandInput } from "@/entities/brand";
import { apiError } from "@/shared/api/client";
import { slugify } from "@/shared/lib/slug";
import { formatDateTime } from "@/shared/lib/format";

const empty: BrandInput = { name: "", slug: "", logo_url: "" };

const inpCls = "h-9 text-[13px]";

export function AdminBrandsPage() {
  const [items, setItems] = useState<Brand[] | null>(null);
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [form, setForm] = useState<BrandInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { confirmProps, askConfirm } = useConfirm();

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
    const ok = await askConfirm({
      title: "¿Eliminar marca?",
      message: `¿Eliminar la marca "${b.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await brandApi.remove(b.id);
    await load();
  };

  const set = (patch: Partial<BrandInput>) => setForm((f) => ({ ...f, ...patch }));

  const columns: Column<Brand>[] = [
    {
      header: "Marca",
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm shrink-0 border border-border bg-white flex items-center justify-center overflow-hidden">
            {b.logo_url
              ? <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              : <span className="font-display font-black text-[13px] text-primary">{b.name.slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <strong className="text-ink900">{b.name}</strong>
        </div>
      ),
    },
    {
      header: "Logo",
      render: (b) => b.logo_url
        ? <span className="font-mono text-[11px] text-primary">Configurado</span>
        : <span className="text-textFaint text-[13px]">—</span>,
    },
    {
      header: "Creada",
      render: (b) => <span className="text-[13px] text-textMuted">{formatDateTime(b.created_at)}</span>,
    },
    {
      header: "Acciones",
      align: "right",
      render: (b) => (
        <div className="inline-flex gap-2">
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

      <ConfirmModal {...confirmProps} />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow={editing === "new" ? "NUEVA MARCA" : "EDITAR MARCA"}
        title="Marca"
        width={560}
        footer={
          <div className="flex items-center gap-3 w-full">
            {error && <span className="font-body text-xs text-danger flex-1">{error}</span>}
            <Button type="submit" form="brand-form" fullWidth disabled={saving}>
              {saving ? "Guardando…" : editing === "new" ? "Crear marca" : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <form id="brand-form" onSubmit={save} className="flex flex-col gap-3.5">

          <CompactField label="Nombre de la marca *">
            <Input
              required
              value={form.name}
              placeholder="Ej. Bosch, NGK, Monroe…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })}
              className={inpCls}
            />
          </CompactField>

          <CompactField label="URL del logo (opcional)">
            <Input
              value={form.logo_url ?? ""}
              placeholder="https://ejemplo.com/logo.png"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { set({ logo_url: e.target.value }); setLogoError(false); }}
              className={inpCls}
            />
          </CompactField>

          {/* Logo preview */}
          {form.logo_url && (
            <div className="rounded-md border border-border bg-[#fafafa] p-4 flex items-center gap-3.5">
              <div className="w-16 h-12 rounded-sm border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                {hasLogo
                  ? <img src={form.logo_url} alt="preview" className="max-w-full max-h-full object-contain" onError={() => setLogoError(true)} />
                  : <Icon name="image" size={20} className="text-textFaint" />
                }
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[.1em] text-textFaint uppercase mb-[3px]">Vista previa</div>
                <div className={`font-body text-[12.5px] ${logoError ? "text-danger" : "text-textMuted"}`}>
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

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[9.5px] font-bold tracking-[.12em] text-textFaint uppercase">{label}</span>
      {children}
    </div>
  );
}
