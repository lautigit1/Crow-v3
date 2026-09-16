import type * as React from "react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, Badge, Input, Icon, CenteredSpinner, type Column } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { StatCard } from "./ui/StatCard";
import { productApi, type Product } from "@/entities/product";
import { productKeys, useInventoryQuery } from "@/entities/product/queries";
import { formatPrice } from "@/shared/lib/format";

const LOW = 5;
export function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const inventario = useInventoryQuery();
  const items = inventario.data ?? null;
  const loadError = inventario.isError;
  const [onlyLow, setOnlyLow] = useState(false);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const rows = useMemo(() => {
    if (!items) return [];
    return onlyLow ? items.filter((p) => p.stock <= LOW) : items;
  }, [items, onlyLow]);

  const summary = useMemo(() => {
    const list = items ?? [];
    return {
      out: list.filter((p) => p.stock <= 0).length,
      low: list.filter((p) => p.stock > 0 && p.stock <= LOW).length,
      value: list.reduce((s, p) => s + (p.price ?? 0) * p.stock, 0),
    };
  }, [items]);

  const saveStock = async (p: Product) => {
    const next = draft[p.id];
    if (next == null || next === p.stock) return;
    setSavingId(p.id);
    try {
      const updated = await productApi.update(p.id, { stock: next });
      queryClient.setQueryData<Product[]>(productKeys.inventory(), (prev) =>
        prev?.map((x) => (x.id === p.id ? updated : x)),
      );
      // El resto de las vistas de productos (listado, catálogo) muestran el
      // mismo stock: se marcan viejas sin refetchear esta.
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      setDraft((d) => {
        const next = { ...d };
        delete next[p.id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  const columns: Column<Product>[] = [
    {
      rol: "titulo",
      header: "Producto",
      render: (p) => (
        <div>
          <strong className="text-ink900">{p.name}</strong>
          <div className="font-mono text-[11px] text-textFaint">{p.sku} · {p.brand?.name ?? "—"}</div>
        </div>
      ),
    },
    { rol: "subtitulo", header: "Categoría", render: (p) => p.category?.name ?? "—" },
    { header: "Precio", align: "right", render: (p) => formatPrice(p.price) },
    {
      header: "Estado",
      render: (p) => (
        <Badge tone={p.stock <= 0 ? "danger" : p.stock <= LOW ? "warning" : "success"}>
          {p.stock <= 0 ? "Sin stock" : p.stock <= LOW ? "Bajo" : "OK"}
        </Badge>
      ),
    },
    {
      header: "Stock",
      align: "right",
      width: 200,
      render: (p) => {
        const value = draft[p.id] ?? p.stock;
        const dirty = draft[p.id] != null && draft[p.id] !== p.stock;
        return (
          <div className="inline-flex gap-2 items-center">
            <div className="w-[84px]">
              <Input
                type="number"
                min={0}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [p.id]: Number(e.target.value) }))}
                className="h-9 text-right"
              />
            </div>
            <Button size="sm" variant={dirty ? "primary" : "ghost"} disabled={!dirty || savingId === p.id} onClick={() => saveStock(p)}>
              {savingId === p.id ? "…" : <Icon name="check" size={15} />}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Inventario"
        icon="inventory"
        subtitle="Control de stock y reposición."
        action={
          <Button variant={onlyLow ? "primary" : "outline"} onClick={() => setOnlyLow((v) => !v)}>
            <Icon name="alert" size={16} /> Solo bajo stock
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-[22px]">
        <StatCard icon="alert" label="Sin stock" value={summary.out} tone="danger" />
        <StatCard icon="box" label="Stock bajo (≤ 5)" value={summary.low} tone="warning" />
        <StatCard icon="trendingUp" label="Valor de inventario" value={formatPrice(summary.value)} tone="primary" />
      </div>

      {items === null ? <CenteredSpinner /> : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(p) => p.id}
          empty={loadError ? "No se pudo cargar el inventario. Recargá la página." : "No hay productos."}
        />
      )}
    </div>
  );
}
