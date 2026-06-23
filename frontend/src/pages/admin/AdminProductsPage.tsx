import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button, DataTable, Modal, Drawer, Field, Input, Textarea, Select, Badge, CenteredSpinner, Icon, Pagination,
  ProductImage, type Column, type SortState,
} from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { productApi, type Product, type ProductInput, type ProductSort } from "@/entities/product";
import { categoryApi, type Category } from "@/entities/category";
import { brandApi, type Brand } from "@/entities/brand";
import { supplierApi, type Supplier } from "@/entities/supplier";
import { apiError } from "@/shared/api/client";
import { formatPrice, formatDateTime } from "@/shared/lib/format";
import { VEHICLE_TYPES } from "@/shared/config/categories";
import { color, font } from "@/shared/config/theme";

const PAGE = 10;

const empty: ProductInput = {
  name: "", sku: "", description: "", price: null, stock: 0, image_url: "",
  vehicle_type: "Universal", is_featured: false, category_id: null, brand_id: null, supplier_id: null,
};

function toSort(s: SortState | undefined): ProductSort {
  if (!s) return "recent";
  if (s.key === "name") return "name";
  if (s.key === "price") return s.dir === "asc" ? "price_asc" : "price_desc";
  if (s.key === "stock") return s.dir === "asc" ? "stock_asc" : "stock_desc";
  return "recent";
}

export function AdminProductsPage() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // filters / paging
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [stockOnly, setStockOnly] = useState(false);
  const [sort, setSort] = useState<SortState>();
  const [page, setPage] = useState(0);

  // modal (create/edit)
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState<ProductInput>(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // drawer (detail)
  const [detail, setDetail] = useState<Product | null>(null);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
    brandApi.list().then(setBrands).catch(() => setBrands([]));
    supplierApi.list({ active_only: true, limit: 500 }).then((r) => setSuppliers(r.items)).catch(() => setSuppliers([]));
  }, []);

  const reload = () => {
    setItems(null);
    return productApi
      .list({
        q: q || undefined,
        category_id: categoryId || undefined,
        brand_id: brandId || undefined,
        supplier_id: supplierId || undefined,
        in_stock: stockOnly || undefined,
        sort: toSort(sort),
        skip: page * PAGE,
        limit: PAGE,
      })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      });
  };

  useEffect(() => {
    const h = setTimeout(reload, 200);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId, brandId, supplierId, stockOnly, sort, page]);

  const resetTo0 = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const onSort = (key: string) =>
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const openNew = () => { setForm(empty); setEditing("new"); setError(""); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name, sku: p.sku, description: p.description ?? "", price: p.price, stock: p.stock,
      image_url: p.image_url ?? "", vehicle_type: p.vehicle_type, is_featured: p.is_featured,
      category_id: p.category_id, brand_id: p.brand_id, supplier_id: p.supplier_id,
    });
    setEditing(p);
    setError("");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing === "new") await productApi.create(form);
      else if (editing) await productApi.update(editing.id, form);
      setEditing(null);
      setDetail(null);
      await reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    await productApi.remove(p.id);
    setDetail(null);
    await reload();
  };

  const set = (patch: Partial<ProductInput>) => setForm((f) => ({ ...f, ...patch }));

  const columns: Column<Product>[] = [
    {
      header: "Producto",
      sortKey: "name",
      render: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, flex: "none", borderRadius: 8, overflow: "hidden", border: `1px solid ${color.border}` }}>
            <ProductImage name={p.name} category={p.category?.name} imageUrl={p.image_url} ratio={1} />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ color: color.ink900 }}>{p.name}</strong>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{p.sku}</div>
          </div>
        </div>
      ),
    },
    { header: "Categoría", render: (p) => p.category?.name ?? "—" },
    { header: "Marca", render: (p) => p.brand?.name ?? "—" },
    {
      header: "Proveedor",
      render: (p) =>
        p.supplier ? (
          <span style={{ fontSize: 13, color: color.primary, fontWeight: 600 }}>{p.supplier.name}</span>
        ) : (
          <span style={{ color: color.textFaint }}>—</span>
        ),
    },
    { header: "Precio", align: "right", sortKey: "price", render: (p) => formatPrice(p.price) },
    {
      header: "Stock",
      align: "right",
      sortKey: "stock",
      render: (p) => <Badge tone={p.stock <= 0 ? "danger" : p.stock <= 5 ? "warning" : "success"}>{p.stock}</Badge>,
    },
    { header: "Dest.", align: "center", render: (p) => (p.is_featured ? <Icon name="star" size={15} style={{ display: "inline", color: color.primary }} /> : "—") },
    {
      header: "Acciones",
      align: "right",
      render: (p) => (
        <div style={{ display: "inline-flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Icon name="edit" size={14} /> Editar</Button>
          <Button variant="danger" size="sm" onClick={() => remove(p)}><Icon name="trash" size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Productos" icon="products" subtitle={`${total} productos en catálogo`} action={<Button onClick={openNew}><Icon name="plus" size={16} /> Nuevo producto</Button>} />

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: color.textFaint }}><Icon name="search" size={16} /></span>
          <Input value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => resetTo0(setQ)(e.target.value)} placeholder="Buscar por nombre, SKU o descripción" style={{ paddingLeft: 38 }} />
        </div>
        <div style={{ width: 160 }}>
          <Select value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => resetTo0(setCategoryId)(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div style={{ width: 150 }}>
          <Select value={brandId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => resetTo0(setBrandId)(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Todas las marcas</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        <div style={{ width: 160 }}>
          <Select value={supplierId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => resetTo0(setSupplierId)(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <Button variant={stockOnly ? "primary" : "outline"} onClick={() => resetTo0(setStockOnly)(!stockOnly)}>
          <Icon name="box" size={16} /> En stock
        </Button>
      </div>

      {items === null ? (
        <CenteredSpinner />
      ) : (
        <>
          <DataTable columns={columns} rows={items} getKey={(p) => p.id} empty="No hay productos." sort={sort} onSort={onSort} onRowClick={setDetail} />
          <Pagination page={page} pageSize={PAGE} total={total} onPage={setPage} />
        </>
      )}

      {/* Detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        eyebrow={detail?.sku}
        title={detail?.name}
        footer={detail && (
          <>
            <Button onClick={() => openEdit(detail)} fullWidth><Icon name="edit" size={15} /> Editar</Button>
            <Button variant="danger" onClick={() => remove(detail)}><Icon name="trash" size={15} /></Button>
          </>
        )}
      >
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${color.border}` }}>
              <ProductImage name={detail.name} sku={detail.sku} category={detail.category?.name} imageUrl={detail.image_url} ratio={1.7} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge tone={detail.stock <= 0 ? "danger" : detail.stock <= 5 ? "warning" : "success"}>{detail.stock} en stock</Badge>
              {detail.is_featured && <Badge tone="primary">Destacado</Badge>}
              <Badge tone="neutral">{detail.vehicle_type}</Badge>
            </div>
            <div style={{ fontFamily: font.display, fontSize: 26, fontWeight: 900, color: color.primary }}>{formatPrice(detail.price)}</div>
            {detail.description && <p style={{ fontFamily: font.body, fontSize: 14, lineHeight: 1.6, color: color.textMuted }}>{detail.description}</p>}
            <div style={{ borderTop: `1px solid ${color.border}`, paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Detail label="Categoría" value={detail.category?.name ?? "—"} />
              <Detail label="Marca" value={detail.brand?.name ?? "—"} />
              <Detail label="Proveedor" value={detail.supplier?.name ?? "—"} />
              <Detail label="Tipo vehículo" value={detail.vehicle_type} />
              <Detail label="Creado" value={formatDateTime(detail.created_at)} />
              <Detail label="Actualizado" value={formatDateTime(detail.updated_at)} />
            </div>
          </div>
        )}
      </Drawer>

      {/* Create / edit modal */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} eyebrow={editing === "new" ? "NUEVO" : "EDITAR"} title="Producto" width={580}>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nombre"><Input required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })} /></Field>
            <Field label="SKU"><Input required value={form.sku} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ sku: e.target.value })} /></Field>
          </div>
          <Field label="Descripción">
            <Textarea rows={2} value={form.description ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ description: e.target.value })} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Precio (ARS)">
              <Input type="number" min={0} value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ price: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Stock">
              <Input type="number" min={0} value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ stock: Number(e.target.value) })} />
            </Field>
            <Field label="Tipo vehículo">
              <Select value={form.vehicle_type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ vehicle_type: e.target.value })}>
                {VEHICLE_TYPES.filter((t) => t !== "Todos").map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Categoría">
              <Select value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ category_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Marca">
              <Select value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ brand_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Proveedor">
              <Select value={form.supplier_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ supplier_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="URL de imagen (opcional)">
            <Input value={form.image_url ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ image_url: e.target.value })} placeholder="https://…" />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: font.body, fontSize: 14, color: color.ink800 }}>
            <input type="checkbox" checked={!!form.is_featured} onChange={(e) => set({ is_featured: e.target.checked })} style={{ width: 16, height: 16, accentColor: color.primary }} />
            Producto destacado en la landing
          </label>
          {error && <div style={{ fontFamily: font.body, fontSize: 13, color: color.danger }}>{error}</div>}
          <Button type="submit" fullWidth disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</Button>
        </form>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".06em", color: color.textFaint, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: font.body, fontSize: 14, color: color.ink900 }}>{value}</div>
    </div>
  );
}
