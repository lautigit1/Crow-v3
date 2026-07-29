import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import {
  CenteredSpinner,
  EmptyState,
  Icon,
  Button,
  Drawer,
  Modal,
  Pagination,
  ConfirmModal,
} from "@/shared/ui";
import { type Order, type OrderCreate } from "@/entities/order";
import { useMyOrdersQuery, useCreateOrderMutation, useCancelOrderMutation } from "@/entities/order/queries";
import { productApi, type Product } from "@/entities/product";
import { formatPrice } from "@/shared/lib/format";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
// `ORDER_STATUS_COLOR` is a fixed 6-status enum (only consumed on this page),
// so its hex values are mirrored here as complete literal Tailwind classes
// (bg tint + text) instead of building `hex + "22"` at runtime.
const STATUS_BADGE: Record<Order["status"], string> = {
  Pendiente: "bg-[#f59e0b22] text-[#f59e0b]",
  Confirmado: "bg-[#3b82f622] text-[#3b82f6]",
  "En proceso": "bg-[#8b5cf622] text-[#8b5cf6]",
  Enviado: "bg-[#06b6d422] text-[#06b6d4]",
  Entregado: "bg-[#22c55e22] text-[#22c55e]",
  Cancelado: "bg-[#ef444422] text-[#ef4444]",
};

// Mismo criterio que arriba para el eje del cobro. "Sin cobrar" queda en gris
// a propósito: es el estado inicial de todos los pedidos y pintarlo de rojo
// haría que cada compra recién hecha parezca un problema.
const PAYMENT_BADGE: Record<Order["payment_status"], string> = {
  "Sin cobrar": "bg-[#94a3b822] text-[#64748b]",
  "Link enviado": "bg-[#f59e0b22] text-[#f59e0b]",
  Pagado: "bg-[#22c55e22] text-[#22c55e]",
};

// El estado es una palabra ("Entregado"), no un dato tabular: en Fira Mono y
// mayúscula leía como un código de sistema en vez de algo escrito para alguien.
function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={clsx("inline-block py-1 px-2.5 rounded-pill font-body text-[12px] font-semibold", STATUS_BADGE[status] ?? "bg-[#6b728022] text-[#6b7280]")}>
      {status}
    </span>
  );
}

/**
 * Estado del cobro, que es independiente del de entrega.
 *
 * Se le muestra al cliente para que no tenga que preguntar si su pago ya
 * figura. El texto se reformula desde su punto de vista: "Sin cobrar" es
 * lenguaje del negocio y del otro lado se lee mejor como "Pago pendiente".
 */
const PAYMENT_LABEL: Record<Order["payment_status"], string> = {
  "Sin cobrar": "Pago pendiente",
  "Link enviado": "Link de pago enviado",
  Pagado: "Pagado",
};

function PaymentBadge({ status }: { status: Order["payment_status"] }) {
  return (
    <span className={clsx("inline-block py-1 px-2.5 rounded-pill font-body text-[12px] font-semibold", PAYMENT_BADGE[status] ?? "bg-[#6b728022] text-[#6b7280]")}>
      {PAYMENT_LABEL[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Order card (list item)
// ---------------------------------------------------------------------------
// `hov` used to be tracked in JS purely to swap a static border-color/
// box-shadow pair -- both are native `hover:` now.
function OrderCard({ order, onExpand }: { order: Order; onExpand: () => void }) {
  const total = order.items.reduce(
    (acc, item) => acc + (item.unit_price_snapshot ?? 0) * item.quantity,
    0,
  );

  return (
    <div
      onClick={onExpand}
      className="bg-white border border-border rounded-md py-4 px-5 flex items-center justify-between gap-3 cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-primary hover:shadow-[0_2px_12px_rgba(0,87,217,.08)]"
    >
      <div className="flex flex-col gap-1">
        <span className="font-display font-bold text-[15px] text-ink900">
          Pedido #{order.id}
        </span>
        <span className="font-body text-[13px] text-textFaint">
          {new Date(order.created_at).toLocaleDateString("es-AR", {
            day: "2-digit", month: "short", year: "numeric",
          })}
          {" · "}
          {order.items.length} ítem{order.items.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {total > 0 && (
          <span className="font-mono font-bold text-sm text-ink900">
            {formatPrice(total)}
          </span>
        )}
        <StatusBadge status={order.status} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order detail drawer body
// ---------------------------------------------------------------------------
function OrderDetailBody({ order }: { order: Order }) {
  const total = order.items.reduce(
    (acc, item) => acc + (item.unit_price_snapshot ?? 0) * item.quantity,
    0,
  );

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Status + date */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.payment_status} />
        <span className="font-body text-[13px] text-textFaint">
          {new Date(order.created_at).toLocaleDateString("es-AR", {
            day: "2-digit", month: "long", year: "numeric",
          })}
        </span>
      </div>

      {/* Método de pago */}
      {order.payment_method && (
        <div className="flex items-center gap-2">
          <span className="font-body text-[12px] font-semibold text-textFaint">
            Pago
          </span>
          <span className="font-body text-[13px] font-bold text-ink800">
            {order.payment_method}
          </span>
        </div>
      )}

      {/* User notes */}
      {order.notes && (
        <div className="bg-white border border-border rounded-sm py-3 px-4">
          <div className="font-body text-[12px] font-semibold text-textFaint mb-1.5">
            Tus notas
          </div>
          <div className="font-body text-sm text-ink700 leading-[1.5]">{order.notes}</div>
        </div>
      )}

      {/* Admin notes */}
      {order.admin_notes && (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-sm py-3 px-4">
          <div className="font-body text-[12px] font-semibold text-[#92400e] mb-1.5">
            Respuesta del equipo
          </div>
          <div className="font-body text-sm text-[#78350f] leading-[1.5]">{order.admin_notes}</div>
        </div>
      )}

      {/* Items */}
      <div>
        <div className="font-body text-[12px] font-semibold text-textFaint mb-2.5">
          Ítems
        </div>
        <div className="flex flex-col gap-1.5">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center py-2.5 px-3.5 bg-white border border-border rounded-sm"
            >
              <div>
                <div className="font-body text-sm font-semibold text-ink900">
                  {item.name_snapshot}
                </div>
                <div className="font-mono text-[11px] text-textFaint mt-0.5">
                  SKU {item.sku_snapshot}
                  {item.unit_price_snapshot != null && (
                    <> · {formatPrice(item.unit_price_snapshot)} c/u</>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[13px] font-bold text-ink900">
                  {item.unit_price_snapshot != null
                    ? formatPrice(item.unit_price_snapshot * item.quantity)
                    : "—"}
                </div>
                <div className="font-body text-[11px] text-textFaint">
                  ×{item.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="flex justify-between items-center py-3 px-4 bg-primarySoft rounded-sm">
          <span className="font-body text-sm font-semibold text-primaryDark">Total estimado</span>
          <span className="font-mono text-base font-extrabold text-primary">
            {formatPrice(total)}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
type DraftItem = { product: Product; quantity: number };
const PAGE_SIZE = 10;

const inputCls = "w-full py-[9px] px-3 border border-border rounded-sm font-body text-sm text-ink900 outline-none bg-white box-border";

export function MyOrdersPage() {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // State for create modal to drive its footer
  const [createNotes, setCreateNotes] = useState("");
  const [createItems, setCreateItems] = useState<DraftItem[]>([]);
  const [createSearch, setCreateSearch] = useState("");
  const [createSearchResults, setCreateSearchResults] = useState<Product[]>([]);
  const [createSearching, setCreateSearching] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Listado de pedidos vía TanStack Query -- crear/cancelar invalidan esta
  // query automáticamente (ver entities/order/queries.ts), así que no hace
  // falta un `fetchOrders` manual ni pasar `page` a mano después de cada
  // mutación.
  const { data, isPending } = useMyOrdersQuery({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
  const orders = data?.items ?? null;
  const total = data?.total ?? 0;
  const createOrderMutation = useCreateOrderMutation();
  const cancelOrderMutation = useCancelOrderMutation();

  // Debounced product search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setCreateSearchResults([]); return; }
    setCreateSearching(true);
    try {
      const res = await productApi.list({ q, limit: 8, in_stock: false });
      setCreateSearchResults(res.items.filter((p) => !p.is_deleted));
    } catch {
      setCreateSearchResults([]);
    } finally {
      setCreateSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(createSearch), 300);
    return () => clearTimeout(t);
  }, [createSearch, doSearch]);

  const addItem = (product: Product) => {
    setCreateItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setCreateSearch("");
    setCreateSearchResults([]);
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) {
      setCreateItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCreateItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  };

  const handleCreate = async () => {
    if (createItems.length === 0) { setCreateError("Agregá al menos un producto"); return; }
    setCreateError(null);
    try {
      const payload: OrderCreate = {
        notes: createNotes.trim() || null,
        items: createItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      };
      await createOrderMutation.mutateAsync(payload);
      setShowCreate(false);
      setCreateItems([]);
      setCreateNotes("");
      setPage(0);
    } catch {
      setCreateError("No se pudo crear el pedido. Intentá de nuevo.");
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    try {
      const updated = await cancelOrderMutation.mutateAsync(selected.id);
      setSelected(updated);
      setConfirmCancel(false);
    } catch {
      setConfirmCancel(false);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink900 m-0">
          Mis pedidos
        </h1>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo pedido</Button>
      </div>

      {/* List */}
      {isPending ? (
        <CenteredSpinner label="Cargando pedidos…" />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={<Icon name="box" size={24} />}
          title="No tenés pedidos todavía"
          message="Creá tu primer pedido para solicitar productos directamente a nuestro equipo."
          action={<Button onClick={() => setShowCreate(true)}>Crear pedido</Button>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} onExpand={() => setSelected(o)} />
            ))}
          </div>
          {total > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
          )}
        </>
      )}

      {/* Order detail — Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Pedido #${selected.id}` : ""}
        eyebrow="Mis pedidos"
        footer={
          selected?.status === "Pendiente" ? (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancelar pedido
            </Button>
          ) : undefined
        }
      >
        {selected && <OrderDetailBody order={selected} />}
      </Drawer>

      {/* Cancel confirmation */}
      <ConfirmModal
        open={confirmCancel}
        title="Cancelar pedido"
        message={`¿Confirmás que querés cancelar el Pedido #${selected?.id}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        danger
        loading={cancelOrderMutation.isPending}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />

      {/* Create order — Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateItems([]); setCreateNotes(""); setCreateError(null); }}
        title="Nuevo pedido"
        eyebrow="Pedidos"
        width={520}
        footer={
          <div className="flex gap-2.5 justify-end">
            <Button variant="ghost" onClick={() => { setShowCreate(false); setCreateItems([]); setCreateNotes(""); setCreateError(null); }} disabled={createOrderMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createOrderMutation.isPending || createItems.length === 0}>
              {createOrderMutation.isPending ? "Enviando…" : "Crear pedido"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3.5">
          {/* Buscador */}
          <div>
            <label className="font-body text-[13px] font-semibold text-ink700 block mb-1.5">
              Buscar producto
            </label>
            <input
              className={inputCls}
              placeholder="Nombre o SKU…"
              value={createSearch}
              onChange={(e) => setCreateSearch(e.target.value)}
              autoFocus
            />
            {(createSearching || createSearchResults.length > 0) && (
              <div className="border border-border rounded-sm mt-1 overflow-hidden bg-white">
                {createSearching ? (
                  <div className="py-2.5 px-3.5 font-body text-[13px] text-textFaint">Buscando…</div>
                ) : createSearchResults.length === 0 ? (
                  <div className="py-2.5 px-3.5 font-body text-[13px] text-textFaint">Sin resultados</div>
                ) : createSearchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="flex justify-between items-center w-full py-2.5 px-3.5 bg-transparent border-none border-b border-border cursor-pointer text-left transition-colors duration-100 hover:bg-primarySoft"
                  >
                    <span className="font-body text-sm text-ink900">{p.name}</span>
                    <span className="font-mono text-[11px] text-textFaint">SKU {p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items draft */}
          {createItems.length > 0 && (
            <div>
              <div className="font-body text-[12px] font-semibold text-textFaint mb-2">
                Ítems agregados
              </div>
              <div className="flex flex-col gap-1.5">
                {createItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-2.5 py-2 px-3 bg-surface border border-border rounded-sm">
                    <span className="font-body text-sm text-ink900 flex-1">{product.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(product.id, quantity - 1)} className="w-[26px] h-[26px] rounded border border-border bg-white cursor-pointer font-bold text-base leading-none">−</button>
                      <span className="font-mono text-sm min-w-6 text-center">{quantity}</span>
                      <button onClick={() => updateQty(product.id, quantity + 1)} className="w-[26px] h-[26px] rounded border border-border bg-white cursor-pointer font-bold text-base leading-none">+</button>
                    </div>
                    <button onClick={() => updateQty(product.id, 0)} className="bg-transparent border-none cursor-pointer text-textFaint text-lg leading-none py-0 px-0.5">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="font-body text-[13px] font-semibold text-ink700 block mb-1.5">
              Notas <span className="font-normal text-textFaint">(opcional)</span>
            </label>
            <textarea
              className={clsx(inputCls, "resize-y min-h-[70px]")}
              placeholder="Aclaraciones, vehículo, urgencia…"
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
            />
          </div>

          {createError && (
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-sm py-2.5 px-3.5 font-body text-[13px] text-[#b91c1c]">
              {createError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
