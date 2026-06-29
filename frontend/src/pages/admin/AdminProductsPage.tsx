import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button, DataTable, Modal, Drawer, Field, Input, Textarea, Select, Badge, CenteredSpinner, Icon, Pagination,
  ProductImage, ConfirmModal, type Column, type SortState,
} from "@/shared/ui";
import { useConfirm } from "@/shared/hooks/useConfirm";
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
  const [tab, setTab] = useState<"active" | "deleted">("active");

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
  const { confirmProps, askConfirm } = useConfirm();

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
    brandApi.list().then(setBrands).catch(() => setBrands([]));
    supplierApi.list({ active_only: true, limit: 500 }).then((r) => setSuppliers(r.items)).catch(() => setSuppliers([]));
  }, []);

  const reload = () => {
    setItems(null);
    const promise =
      tab === "deleted"
        ? productApi.listDeleted({ skip: page * PAGE, limit: PAGE })
        : productApi.list({
            q: q || undefined,
            category_id: categoryId || undefined,
            brand_id: brandId || undefined,
            supplier_id: supplierId || undefined,
            in_stock: stockOnly || undefined,
            sort: toSort(sort),
            skip: page * PAGE,
            limit: PAGE,
          });
    return promise
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
  }, [tab, q, categoryId, brandId, supplierId, stockOnly, sort, page]);

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
    const ok = await askConfirm({
      title: "¿Eliminar producto?",
      message: `¿Eliminar "${p.name}"? El producto quedará desactivado y podrá restaurarse después.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    await productApi.remove(p.id);
    setDetail(null);
    await reload();
  };

  const restore = async (p: Product) => {
    await productApi.restore(p.id);
    setDetail(null);
    await reload();
  };

  const set = (patch: Partial<ProductInput>) => setForm((f) => ({ ...f, ...patch }));

  const productNameCell = (p: Product) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 44, flex: "none", borderRadius: 8, overflow: "hidden", border: `1px solid ${color.border}` }}>
        <ProductImage name={p.name} category={p.category?.name} imageUrl={p.image_url} ratio={1} />
      </div>
      <div style={{ minWidth: 0 }}>
        <strong style={{ color: color.ink900 }}>{p.name}</strong>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{p.sku}</div>
      </div>
    </div>
  );

  const columns: Column<Product>[] = [
    { header: "Producto", sortKey: "name", render: productNameCell },
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

  const deletedColumns: Column<Product>[] = [
    { header: "Producto", render: productNameCell },
    { header: "Categoría", render: (p) => p.category?.name ?? "—" },
    { header: "Marca", render: (p) => p.brand?.name ?? "—" },
    { header: "Precio", align: "right", render: (p) => formatPrice(p.price) },
    {
      header: "Eliminado",
      align: "right",
      render: (p) => (
        <span style={{ fontFamily: font.mono, fontSize: 12, color: color.danger }}>
          {p.deleted_at ? formatDateTime(p.deleted_at) : "—"}
        </span>
      ),
    },
    {
      header: "Acciones",
      align: "right",
      render: (p) => (
        <div style={{ display: "inline-flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => restore(p)}>
            <Icon name="refresh" size={14} /> Restaurar
          </Button>
        </div>
      ),
    },
  ];

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    background: active ? color.primary : "transparent",
    color: active ? "#fff" : color.textMuted,
    transition: "background 0.15s, color 0.15s",
  });

  return (
    <div>
      <AdminHeader
        title="Productos"
        icon="products"
        subtitle={tab === "active" ? `${total} productos en catálogo` : `${total} productos eliminados`}
        action={tab === "active" ? <Button onClick={openNew}><Icon name="plus" size={16} /> Nuevo producto</Button> : undefined}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: color.surface, borderRadius: 10, padding: 4, width: "fit-content" }}>
        <button style={tabStyle(tab === "active")} onClick={() => { setTab("active"); setPage(0); }}>
          Activos
        </button>
        <button style={tabStyle(tab === "deleted")} onClick={() => { setTab("deleted"); setPage(0); }}>
          <Icon name="trash" size={13} /> Eliminados
        </button>
      </div>

      {/* Toolbar (solo en tab activos) */}
      {tab === "active" && (
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
      )}

      {items === null ? (
        <CenteredSpinner />
      ) : tab === "deleted" ? (
        <>
          <DataTable
            columns={deletedColumns}
            rows={items}
            getKey={(p) => p.id}
            empty="No hay productos eliminados."
            onRowClick={setDetail}
          />
          <Pagination page={page} pageSize={PAGE} total={total} onPage={setPage} />
        </>
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
          detail.is_deleted ? (
            <Button variant="outline" onClick={() => restore(detail)} fullWidth>
              <Icon name="refresh" size={15} /> Restaurar producto
            </Button>
          ) : (
            <>
              <Button onClick={() => openEdit(detail)} fullWidth><Icon name="edit" size={15} /> Editar</Button>
              <Button variant="danger" onClick={() => remove(detail)}><Icon name="trash" size={15} /></Button>
            </>
          )
        )}
      >
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {detail.is_deleted && (
              <div style={{ background: "#FEF2F2", border: `1px solid ${color.danger}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="trash" size={14} style={{ color: color.danger, flexShrink: 0 }} />
                <span style={{ fontFamily: font.body, fontSize: 13, color: color.danger }}>
                  Eliminado el {detail.deleted_at ? formatDateTime(detail.deleted_at) : "—"}
                </span>
              </div>
            )}
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
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        eyebrow={editing === "new" ? "NUEVO PRODUCTO" : "EDITAR PRODUCTO"}
        title="Producto"
        width={600}
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            {error && <span style={{ fontFamily: font.body, fontSize: 12, color: color.danger, flex: 1 }}>{error}</span>}
            <Button type="submit" form="product-form" disabled={saving} style={{ minWidth: 180 }}>
              {saving ? "Guardando…" : "Guardar producto"}
            </Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Fila 1: Nombre + SKU */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 10 }}>
            <CompactField label="Nombre">
              <Input required value={form.name} placeholder="Kit de frenos delanteros Gol G5" onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })} style={inp} />
            </CompactField>
            <CompactField label="SKU">
              <Input required value={form.sku} placeholder="KIT-001" onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ sku: e.target.value })} style={inp} />
            </CompactField>
          </div>

          {/* Fila 2: Descripción */}
          <CompactField label="Descripción">
            <Textarea rows={2} value={form.description ?? ""} placeholder="Descripción breve del producto…" onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ description: e.target.value })} style={{ fontSize: 13, minHeight: 58 }} />
          </CompactField>

          <Divider label="Precio y stock" />

          {/* Fila 3: Precio + Stock + Vehículo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <CompactField label="Precio (ARS)">
              <Input type="number" min={0} placeholder="0" value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ price: e.target.value ? Number(e.target.value) : null })} style={inp} />
            </CompactField>
            <CompactField label="Stock">
              <Input type="number" min={0} value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ stock: Number(e.target.value) })} style={inp} />
            </CompactField>
            <CompactField label="Tipo vehículo">
              <Select value={form.vehicle_type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ vehicle_type: e.target.value })} style={inp}>
                {VEHICLE_TYPES.filter((t) => t !== "Todos").map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </CompactField>
          </div>

          <Divider label="Clasificación" />

          {/* Fila 4: Categoría + Marca + Proveedor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <CompactField label="Categoría">
              <Select value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ category_id: e.target.value ? Number(e.target.value) : null })} style={inp}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </CompactField>
            <CompactField label="Marca">
              <Select value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ brand_id: e.target.value ? Number(e.target.value) : null })} style={inp}>
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </CompactField>
            <CompactField label="Proveedor">
              <Select value={form.supplier_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ supplier_id: e.target.value ? Number(e.target.value) : null })} style={inp}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </CompactField>
          </div>

          {/* Fila 5: Imagen + Featured */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <CompactField label="URL de imagen (opcional)">
              <Input value={form.image_url ?? ""} placeholder="https://…" onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ image_url: e.target.value })} style={inp} />
            </CompactField>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", paddingBottom: 9, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={!!form.is_featured} onChange={(e) => set({ is_featured: e.target.checked })} style={{ width: 14, height: 14, accentColor: color.primary, cursor: "pointer" }} />
              <span style={{ fontFamily: font.body, fontSize: 12.5, color: color.textMuted }}>Destacado</span>
            </label>
          </div>

        </form>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </div>
  );
}

// Input height override for compact modal
const inp: React.CSSProperties = { height: 34, fontSize: 13 };

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: font.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", color: color.textFaint, textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
      <div style={{ width: 3, height: 12, borderRadius: 2, background: color.primary, flexShrink: 0 }} />
      <span style={{ fontFamily: font.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: ".14em", color: color.textFaint, textTransform: "uppercase" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: color.border }} />
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
