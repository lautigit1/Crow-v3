import { useEffect, useState } from "react";
import clsx from "clsx";
import { Icon, Spinner } from "@/shared/ui";
import { productApi, type StockMovement } from "@/entities/product";
import { formatDateTime } from "@/shared/lib/format";

/**
 * Historial de stock de un producto.
 *
 * Responde la pregunta que antes no tenía respuesta: "¿por qué este producto
 * tiene 3 unidades si compré 20?". Hasta la migración 014 el stock era un
 * número que se pisaba desde cuatro lugares sin dejar rastro.
 *
 * Se carga bajo demanda (al abrir la ficha del producto), no junto con el
 * listado: es un dato que se consulta puntualmente y no vale traerlo para
 * cada fila de la tabla.
 */

const TONO: Record<string, string> = {
  "Venta": "text-danger",
  "Ajuste manual": "text-warning",
  "Alta de producto": "text-primary",
  "Cancelación de pedido": "text-success",
  "Compra a proveedor": "text-success",
};

export function StockHistory({ productId }: { productId: number }) {
  const [items, setItems] = useState<StockMovement[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setItems(null);
    setError(false);
    productApi
      .stockMovements(productId)
      .then((r) => { if (vigente) setItems(r); })
      .catch(() => { if (vigente) { setItems([]); setError(true); } });
    // El flag evita pisar el estado con la respuesta de un producto anterior
    // si el admin cambia de ficha antes de que llegue la primera.
    return () => { vigente = false; };
  }, [productId]);

  if (items === null) return <div className="py-6"><Spinner /></div>;

  if (error) {
    return <p className="m-0 font-body text-[13px] text-danger">No se pudo cargar el historial.</p>;
  }

  if (items.length === 0) {
    return (
      <p className="m-0 font-body text-[13px] leading-snug text-textFaint">
        Sin movimientos registrados. El historial arranca en el momento en que se
        activó esta función: los cambios de stock anteriores no quedaron guardados.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
          <span
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface",
              m.delta > 0 ? "text-success" : "text-danger"
            )}
          >
            <Icon name={m.delta > 0 ? "plus" : "minus"} size={14} />
          </span>

          <div className="min-w-0 flex-1">
            <div className={clsx("font-body text-[13.5px] font-semibold", TONO[m.reason] ?? "text-ink900")}>
              {m.reason}
              {m.order_id != null && <span className="text-textFaint"> · pedido #{m.order_id}</span>}
            </div>
            <div className="mt-0.5 font-body text-[12px] text-textFaint">
              {formatDateTime(m.created_at)}
              {m.note && ` · ${m.note}`}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div
              className={clsx(
                "font-mono text-[13.5px] font-bold [font-variant-numeric:tabular-nums]",
                m.delta > 0 ? "text-success" : "text-danger"
              )}
            >
              {m.delta > 0 ? "+" : ""}{m.delta}
            </div>
            {/* El stock resultante es lo que vuelve auditable la fila: sin él
                habría que sumar toda la cadena para saber dónde quedó. */}
            <div className="font-mono text-[11px] text-textFaint">queda {m.stock_after}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
