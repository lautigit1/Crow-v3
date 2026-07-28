import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import {
  Button, DataTable, Modal, Drawer, Input, Textarea, Select, Badge, CenteredSpinner, Icon, Pagination,
  ProductImage, ConfirmModal, type Column, type SortState,
} from "@/shared/ui";
import { useConfirm } from "@/shared/lib/useConfirm";
import { AdminHeader } from "./ui/AdminHeader";
import { StockHistory } from "./ui/StockHistory";
import { productApi, type Product, type ProductInput, type ProductSort } from "@/entities/product";
import { categoryApi, type Category } from "@/entities/category";
import { brandApi, type Brand } from "@/entities/brand";
import { supplierApi, type Supplier } from "@/entities/supplier";
import { uploadApi } from "@/entities/upload";
import { apiError } from "@/shared/api";
import { formatPrice, formatDateTime } from "@/shared/lib/format";
import { VEHICLE_TYPES } from "@/shared/config";

const PAGE = 10;

const empty: ProductInput = {
  name: "", sku: "", description: "", price: null, cost_price: null, margin_pct: null, stock: 0, image_url: "",
  vehicle_type: "Universal", is_featured: false, category_id: null, brand_id: null, supplier_id: null,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Compact height override for Input/Select inside this modal.
const inpCls = "h-[34px] text-[13px]";

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
  const [uploading, setUploading] = useState(false);

  // drawer (detail)
  const [detail, setDetail] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { confirmProps, askConfirm } = useConfirm();

  useEffect(() => {
    // Datos de soporte para los selects de filtro/formulario -- si alguno
    // falla, el select correspondiente queda vacío pero el resto de la
    // página sigue siendo usable, así que solo se loguea (no bloquea).
    categoryApi.list().then(setCategories).catch((err) => {
      console.error("[AdminProductsPage] no se pudieron cargar las categorías para el filtro:", err);
      setCategories([]);
    });
    brandApi.list().then(setBrands).catch((err) => {
      console.error("[AdminProductsPage] no se pudieron cargar las marcas para el filtro:", err);
      setBrands([]);
    });
    supplierApi.list({ active_only: true, limit: 500 }).then((r) => setSuppliers(r.items)).catch((err) => {
      console.error("[AdminProductsPage] no se pudieron cargar los proveedores para el filtro:", err);
      setSuppliers([]);
    });
  }, []);

  const reload = () => {
    setItems(null);
    setLoadError(false);
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
      .catch((err) => {
        console.error("[AdminProductsPage] no se pudieron cargar los productos:", err);
        setItems([]);
        setTotal(0);
        setLoadError(true);
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
      name: p.name, sku: p.sku, description: p.description ?? "", price: p.price,
      cost_price: p.cost_price ?? null, margin_pct: p.margin_pct ?? null, stock: p.stock,
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

  /**
   * Publica o saca del catálogo. Sin confirmación a propósito: es
   * reversible con el mismo clic, y pedir confirmación para algo que se
   * deshace igual de rápido solo agrega fricción.
   */
  const toggleActive = async (p: Product) => {
    try {
      await productApi.update(p.id, { is_active: !p.is_active });
      await reload();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const set = (patch: Partial<ProductInput>) => setForm((f) => ({ ...f, ...patch }));

  // Costo / margen / precio -- cualquiera de los tres que se edite recalcula
  // el que falta (si hay costo cargado). Editar precio a mano sigue andando,
  // solo actualiza el margen para que quede consistente con lo que se ve.
  const setCostPrice = (v: number | null) =>
    setForm((f) => {
      const next = { ...f, cost_price: v };
      if (v != null && v > 0 && f.margin_pct != null) next.price = round2(v * (1 + f.margin_pct / 100));
      return next;
    });

  const setMarginPct = (v: number | null) =>
    setForm((f) => {
      const next = { ...f, margin_pct: v };
      if (f.cost_price != null && f.cost_price > 0 && v != null) next.price = round2(f.cost_price * (1 + v / 100));
      return next;
    });

  const setPriceManual = (v: number | null) =>
    setForm((f) => {
      const next = { ...f, price: v };
      if (f.cost_price != null && f.cost_price > 0 && v != null) {
        next.margin_pct = round2(((v - f.cost_price) / f.cost_price) * 100);
      }
      return next;
    });

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadApi.uploadProductImage(file);
      set({ image_url: url });
    } catch {
      setError("No se pudo subir la imagen. Probá de nuevo o pegá una URL manualmente.");
    } finally {
      setUploading(false);
      e.target.value = ""; // permite volver a elegir el mismo archivo
    }
  }

  const productNameCell = (p: Product) => (
    <div className="flex items-center gap-3">
      <div className="w-11 flex-none rounded-md overflow-hidden border border-border">
        <ProductImage name={p.name} category={p.category?.name} imageUrl={p.image_url} ratio={1} compact />
      </div>
      <div className="min-w-0">
        <strong className="text-ink900">{p.name}</strong>
        <div className="font-mono text-[11px] text-textFaint">{p.sku}</div>
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
          <span className="text-[13px] text-primary font-semibold">{p.supplier.name}</span>
        ) : (
          <span className="text-textFaint">—</span>
        ),
    },
    { header: "Precio", align: "right", sortKey: "price", render: (p) => formatPrice(p.price) },
    {
      header: "Stock",
      align: "right",
      sortKey: "stock",
      render: (p) => <Badge tone={p.stock <= 0 ? "danger" : p.stock <= 5 ? "warning" : "success"}>{p.stock}</Badge>,
    },
    { header: "Dest.", align: "center", render: (p) => (p.is_featured ? <Icon name="star" size={15} className="inline text-primary" /> : "—") },
    {
      // Se muestra como "En catálogo / Borrador" y no como "Activo": en este
      // panel "activo" ya significa otra cosa en proveedores, y en un
      // producto se confunde con "tiene stock".
      header: "Catálogo",
      align: "center",
      render: (p) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
          title={p.is_active ? "Sacar del catálogo" : "Publicar en el catálogo"}
          className={clsx(
            "cursor-pointer rounded-pill border px-2.5 py-1 font-body text-[11.5px] font-semibold transition-colors duration-150",
            p.is_active
              ? "border-[#BBF7D0] bg-successSoft text-success hover:border-success"
              : "border-borderStrong bg-surface text-textFaint hover:border-primary hover:text-primary"
          )}
        >
          {p.is_active ? "En catálogo" : "Borrador"}
        </button>
      ),
    },
    {
      header: "Acciones",
      align: "right",
      render: (p) => (
        <div className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Icon name="edit" size={14} /> Editar</Button>
          <Button variant="danger" size="sm" onClick={() => remove(p)} aria-label="Eliminar producto"><Icon name="trash" size={14} /></Button>
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
        <span className="font-mono text-xs text-danger">
          {p.deleted_at ? formatDateTime(p.deleted_at) : "—"}
        </span>
      ),
    },
    {
      header: "Acciones",
      align: "right",
      render: (p) => (
        <div className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => restore(p)}>
            <Icon name="refresh" size={14} /> Restaurar
          </Button>
        </div>
      ),
    },
  ];

  // `active` drives which of two static class sets applies -- no need for a
  // per-call inline style object.
  const tabClass = (active: boolean) =>
    clsx(
      "py-[7px] px-[18px] rounded-md border-none cursor-pointer font-body text-[13px] [transition:background-color_.15s,color_.15s]",
      active ? "bg-primary text-white font-bold" : "bg-transparent text-textMuted font-normal"
    );

  return (
    <div>
      <AdminHeader
        title="Productos"
        icon="products"
        subtitle={tab === "active" ? `${total} productos en catálogo` : `${total} productos eliminados`}
        action={tab === "active" ? <Button onClick={openNew}><Icon name="plus" size={16} /> Nuevo producto</Button> : undefined}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface rounded-[10px] p-1 w-fit">
        <button className={tabClass(tab === "active")} onClick={() => { setTab("active"); setPage(0); }}>
          Activos
        </button>
        <button className={tabClass(tab === "deleted")} onClick={() => { setTab("deleted"); setPage(0); }}>
          <Icon name="trash" size={13} /> Eliminados
        </button>
      </div>

      {/* Toolbar (solo en tab activos) */}
      {tab === "active" && (
        <div className="flex gap-3 mb-4 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textFaint"><Icon name="search" size={16} /></span>
            <Input value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => resetTo0(setQ)(e.target.value)} placeholder="Buscar por nombre, SKU o descripción" className="pl-[38px]" />
          </div>
          <div className="w-40">
            <Select value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => resetTo0(setCategoryId)(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="w-[150px]">
            <Select value={brandId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => resetTo0(setBrandId)(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Todas las marcas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="w-40">
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
            empty={loadError ? "No se pudieron cargar los productos eliminados. Recargá la página." : "No hay productos eliminados."}
            onRowClick={setDetail}
          />
          <Pagination page={page} pageSize={PAGE} total={total} onPage={setPage} />
        </>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(p) => p.id}
            empty={loadError ? "No se pudieron cargar los productos. Recargá la página." : "No hay productos."}
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
              <Button variant="danger" onClick={() => remove(detail)} aria-label="Eliminar producto"><Icon name="trash" size={15} /></Button>
            </>
          )
        )}
      >
        {detail && (
          <div className="flex flex-col gap-[18px]">
            {detail.is_deleted && (
              <div className="bg-[#FEF2F2] border border-danger rounded-md py-2.5 px-3.5 flex items-center gap-2">
                <Icon name="trash" size={14} className="text-danger shrink-0" />
                <span className="font-body text-[13px] text-danger">
                  Eliminado el {detail.deleted_at ? formatDateTime(detail.deleted_at) : "—"}
                </span>
              </div>
            )}
            <div className="rounded-[10px] overflow-hidden border border-border">
              <ProductImage name={detail.name} sku={detail.sku} category={detail.category?.name} imageUrl={detail.image_url} ratio={1.7} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge tone={detail.stock <= 0 ? "danger" : detail.stock <= 5 ? "warning" : "success"}>{detail.stock} en stock</Badge>
              {detail.is_featured && <Badge tone="primary">Destacado</Badge>}
              <Badge tone="neutral">{detail.vehicle_type}</Badge>
            </div>
            <div className="font-display text-[26px] font-black text-primary">{formatPrice(detail.price)}</div>
            {detail.description && <p className="font-body text-sm leading-[1.6] text-textMuted">{detail.description}</p>}
            {detail.cost_price != null && (
              <div className="flex gap-5 bg-surface rounded-md py-2.5 px-3.5">
                <Detail label="Costo" value={formatPrice(detail.cost_price)} />
                <Detail label="Margen" value={detail.margin_pct != null ? `${detail.margin_pct}%` : "—"} />
                <Detail label="Ganancia" value={formatPrice((detail.price ?? 0) - detail.cost_price)} />
              </div>
            )}
            <div className="border-t border-border pt-4 grid grid-cols-2 gap-3.5">
              <Detail label="Categoría" value={detail.category?.name ?? "—"} />
              <Detail label="Marca" value={detail.brand?.name ?? "—"} />
              <Detail label="Proveedor" value={detail.supplier?.name ?? "—"} />
              <Detail label="Tipo vehículo" value={detail.vehicle_type} />
              <Detail label="Creado" value={formatDateTime(detail.created_at)} />
              <Detail label="Actualizado" value={formatDateTime(detail.updated_at)} />
            </div>

            {/* Historial de stock -- responde "¿por qué tiene 3 si compré 20?",
                que antes no tenía respuesta posible. Se carga al abrir la
                ficha, no con el listado. */}
            <div className="border-t border-border pt-4">
              <h3 className="m-0 mb-2.5 font-body text-[12.5px] font-semibold text-textFaint">
                Movimientos de stock
              </h3>
              <StockHistory productId={detail.id} />
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
        width={760}
        footer={
          <div className="flex items-center gap-3 w-full">
            {error && <span className="font-body text-xs text-danger flex-1">{error}</span>}
            <Button type="submit" form="product-form" disabled={saving} className="min-w-[180px]">
              {saving ? "Guardando…" : "Guardar producto"}
            </Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={save} className="flex flex-col gap-2.5">

          {/* Fila 1: Nombre + SKU */}
          <div className="grid grid-cols-[1fr_130px] gap-2.5">
            <CompactField label="Nombre">
              <Input required value={form.name} placeholder="Kit de frenos delanteros Gol G5" onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ name: e.target.value })} className={inpCls} />
            </CompactField>
            <CompactField label="SKU">
              <Input required value={form.sku} placeholder="KIT-001" onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ sku: e.target.value })} className={inpCls} />
            </CompactField>
          </div>

          {/* Fila 2: Descripción */}
          <CompactField label="Descripción">
            <Textarea rows={2} value={form.description ?? ""} placeholder="Descripción breve del producto…" onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ description: e.target.value })} className="text-[13px] min-h-[58px]" />
          </CompactField>

          <Divider label="Precio y stock" />

          {/* Fila 3: Costo + Margen + Precio de venta */}
          <div className="grid grid-cols-3 gap-2.5">
            <CompactField label="Precio de costo (ARS)">
              <Input type="number" min={0} placeholder="0" value={form.cost_price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCostPrice(e.target.value ? Number(e.target.value) : null)} className={inpCls} />
            </CompactField>
            <CompactField label="Margen (%)">
              <Input type="number" min={0} step="0.1" placeholder="0" value={form.margin_pct ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarginPct(e.target.value ? Number(e.target.value) : null)} className={inpCls} />
            </CompactField>
            <CompactField label="Precio de venta (ARS)">
              <Input type="number" min={0} placeholder="0" value={form.price ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceManual(e.target.value ? Number(e.target.value) : null)} className={inpCls} />
            </CompactField>
          </div>
          {form.cost_price != null && form.cost_price > 0 && form.margin_pct != null && (
            <p className="font-body text-[11.5px] text-textFaint -mt-1 mx-0 mb-0">
              Se calcula solo con costo y margen -- también podés escribir el precio de venta directo y el margen se ajusta solo.
            </p>
          )}

          {/* Fila 3b: Stock + Vehículo */}
          <div className="grid grid-cols-2 gap-2.5">
            <CompactField label="Stock">
              <Input type="number" min={0} value={form.stock ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ stock: Number(e.target.value) })} className={inpCls} />
            </CompactField>
            <CompactField label="Tipo vehículo">
              <Select value={form.vehicle_type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ vehicle_type: e.target.value })} className={inpCls}>
                {VEHICLE_TYPES.filter((t) => t !== "Todos").map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </CompactField>
          </div>

          <Divider label="Clasificación" />

          {/* Fila 4: Categoría + Marca + Proveedor */}
          <div className="grid grid-cols-3 gap-2.5">
            <CompactField label="Categoría">
              <Select value={form.category_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ category_id: e.target.value ? Number(e.target.value) : null })} className={inpCls}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </CompactField>
            <CompactField label="Marca">
              <Select value={form.brand_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ brand_id: e.target.value ? Number(e.target.value) : null })} className={inpCls}>
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </CompactField>
            <CompactField label="Proveedor">
              <Select value={form.supplier_id ?? ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set({ supplier_id: e.target.value ? Number(e.target.value) : null })} className={inpCls}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </CompactField>
          </div>

          {/* Fila 5: Imagen */}
          <div className="grid grid-cols-[56px_1fr_auto] gap-2.5 items-end">
            <div className="w-14 h-14 rounded-md overflow-hidden border border-border">
              <ProductImage name={form.name || "Producto"} imageUrl={form.image_url} ratio={1} />
            </div>
            <CompactField label="URL de imagen (opcional)">
              <Input value={form.image_url ?? ""} placeholder="https://…" onChange={(e: React.ChangeEvent<HTMLInputElement>) => set({ image_url: e.target.value })} className={inpCls} />
            </CompactField>
            <div>
              <input
                id="product-image-file"
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById("product-image-file")?.click()}
              >
                <Icon name="image" size={14} /> {uploading ? "Subiendo…" : "Subir imagen"}
              </Button>
            </div>
          </div>

          {/* Fila 6: Featured */}
          <label className="inline-flex items-center gap-[7px] cursor-pointer">
            <input type="checkbox" checked={!!form.is_featured} onChange={(e) => set({ is_featured: e.target.checked })} className="w-3.5 h-3.5 accent-primary cursor-pointer" />
            <span className="font-body text-[12.5px] text-textMuted">Destacado</span>
          </label>

        </form>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {/* Mismo criterio que `Field` en shared/ui: DM Sans en sentence case en
          vez de mono 9.5px en mayúscula. Acá el cuerpo es 11.5px y no 12.5px
          porque este formulario es denso a propósito (tres columnas, inputs
          de 34px), pero la familia y el peso son los mismos para que los dos
          formularios se lean como parte del mismo panel. */}
      <span className="font-body text-[11.5px] font-semibold leading-none tracking-[-.005em] text-textMuted">{label}</span>
      {children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 my-0.5">
      <div className="w-[3px] h-3 rounded-[2px] bg-primary shrink-0" />
      <span className="font-body text-[11.5px] font-bold tracking-[-.005em] text-ink800">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.06em] text-textFaint uppercase mb-1">{label}</div>
      <div className="font-body text-sm text-ink900">{value}</div>
    </div>
  );
}
