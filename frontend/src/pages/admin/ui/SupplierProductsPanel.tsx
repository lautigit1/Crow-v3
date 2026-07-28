import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Button, Icon, Input, Spinner } from "@/shared/ui";
import { productApi, type Product } from "@/entities/product";
import { apiError } from "@/shared/api";
import { formatPrice } from "@/shared/lib/format";

const LIMIT = 100;

/**
 * Productos de un proveedor, con publicación individual y en lote.
 *
 * Vive dentro del `Drawer` de proveedores por pedido explícito del usuario
 * (ver openspec/changes/supplier-catalog-and-invoice-import/design.md). El
 * drawer se ensanchó a 820px para que la fila entre; si en la práctica sigue
 * quedando ajustado, el contenido se muda casi sin cambios a una página
 * `/admin/proveedores/:id` -- este componente no sabe dónde está montado.
 *
 * `limit=100` sin paginado a propósito: un proveedor de una PyME de
 * repuestos tiene decenas de productos, no miles, y el buscador filtra
 * arriba. Si algún proveedor pasa el tope se avisa en pantalla en vez de
 * cortar la lista en silencio.
 */
export function SupplierProductsPanel({ supplierId }: { supplierId: number }) {
  const [items, setItems] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const r = await productApi.list({ supplier_id: supplierId, limit: LIMIT });
      setItems(r.items);
      setTotal(r.total);
    } catch (err) {
      setItems([]);
      setError(apiError(err));
    }
  }, [supplierId]);

  // Al cambiar de proveedor se limpia la selección: arrastrar ids del
  // proveedor anterior a una acción en lote sería un desastre silencioso.
  useEffect(() => {
    setSelected(new Set());
    setItems(null);
    void reload();
  }, [reload]);

  const visibles = (items ?? []).filter((p) =>
    q ? (p.name + p.sku).toLowerCase().includes(q.toLowerCase()) : true
  );

  const toggleUno = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const publicar = async (ids: number[], is_active: boolean) => {
    if (ids.length === 0) return;
    setBusy(true);
    setError("");
    try {
      await productApi.bulkActive(ids, is_active);
      setSelected(new Set());
      await reload();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (items === null) return <div className="py-10"><Spinner /></div>;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-textFaint">
          <Icon name="products" size={22} />
        </div>
        <div className="font-body text-[14px] font-semibold text-ink900">Sin productos asignados</div>
        <p className="m-0 mt-1.5 font-body text-[13px] leading-snug text-textMuted">
          Asigná este proveedor desde la ficha de un producto y va a aparecer acá.
        </p>
      </div>
    );
  }

  const idsVisibles = visibles.map((p) => p.id);
  const todosSeleccionados = idsVisibles.length > 0 && idsVisibles.every((id) => selected.has(id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Input
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          placeholder="Buscar por nombre o SKU"
          className="h-10 text-[13.5px]"
        />
        <span className="shrink-0 font-body text-[12.5px] text-textFaint">
          {visibles.length} de {total}
        </span>
      </div>

      {total > LIMIT && (
        <div className="rounded-md border border-[#FDE68A] bg-warningSoft px-3.5 py-2.5 font-body text-[12.5px] text-warning">
          Este proveedor tiene {total} productos y se muestran los primeros {LIMIT}. Usá el buscador para acotar.
        </div>
      )}

      {/* Barra de acciones en lote -- aparece solo con algo seleccionado, así
          no ocupa espacio en el caso normal de mirar la lista. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-md border border-primary bg-primarySoft px-3.5 py-2.5">
          <span className="font-body text-[13px] font-semibold text-primaryDark">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => publicar([...selected], true)}>
              Publicar
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => publicar([...selected], false)}>
              Sacar del catálogo
            </Button>
          </div>
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2.5 border-b border-border pb-2.5">
        <input
          type="checkbox"
          checked={todosSeleccionados}
          onChange={(e) => setSelected(e.target.checked ? new Set(idsVisibles) : new Set())}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
        <span className="font-body text-[12.5px] font-semibold text-textFaint">
          Seleccionar todo lo visible
        </span>
      </label>

      <div className="flex flex-col">
        {visibles.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggleUno(p.id)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-body text-[13.5px] font-semibold text-ink900">{p.name}</div>
              <div className="mt-0.5 font-mono text-[11px] text-textFaint">
                {p.sku} · {formatPrice(p.price)} · stock {p.stock}
              </div>
            </div>
            <button
              disabled={busy}
              onClick={() => publicar([p.id], !p.is_active)}
              title={p.is_active ? "Sacar del catálogo" : "Publicar en el catálogo"}
              className={clsx(
                "shrink-0 cursor-pointer rounded-pill border px-2.5 py-1 font-body text-[11.5px] font-semibold transition-colors duration-150",
                p.is_active
                  ? "border-[#BBF7D0] bg-successSoft text-success hover:border-success"
                  : "border-borderStrong bg-surface text-textFaint hover:border-primary hover:text-primary"
              )}
            >
              {p.is_active ? "En catálogo" : "Borrador"}
            </button>
          </div>
        ))}
      </div>

      {error && <div className="font-body text-[12.5px] text-danger">{error}</div>}
    </div>
  );
}
