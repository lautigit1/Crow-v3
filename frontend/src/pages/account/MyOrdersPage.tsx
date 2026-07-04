import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  CenteredSpinner,
  EmptyState,
  Button,
  Drawer,
  Modal,
  Pagination,
  ConfirmModal,
} from "@/shared/ui";
import { orderApi, ORDER_STATUS_COLOR, type Order, type OrderCreate } from "@/entities/order";
import { productApi, type Product } from "@/entities/product";
import { formatPrice } from "@/shared/lib/format";
import { color, font, radius } from "@/shared/config/theme";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: Order["status"] }) {
  const bg = ORDER_STATUS_COLOR[status] ?? "#6b7280";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        background: bg + "22",
        color: bg,
        fontFamily: font.mono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Order card (list item)
// ---------------------------------------------------------------------------
function OrderCard({ order, onExpand }: { order: Order; onExpand: () => void }) {
  const total = order.items.reduce(
    (acc, item) => acc + (item.unit_price_snapshot ?? 0) * item.quantity,
    0,
  );
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onExpand}
      style={{
        background: "#fff",
        border: `1px solid ${hov ? color.primary : color.border}`,
        borderRadius: radius.md,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: hov ? "0 2px 12px rgba(0,87,217,.08)" : "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: color.ink900 }}>
          Pedido #{order.id}
        </span>
        <span style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint }}>
          {new Date(order.created_at).toLocaleDateString("es-AR", {
            day: "2-digit", month: "short", year: "numeric",
          })}
          {" · "}
          {order.items.length} ítem{order.items.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {total > 0 && (
          <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 14, color: color.ink900 }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Status + date */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <StatusBadge status={order.status} />
        <span style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint }}>
          {new Date(order.created_at).toLocaleDateString("es-AR", {
            day: "2-digit", month: "long", year: "numeric",
          })}
        </span>
      </div>

      {/* Método de pago */}
      {order.payment_method && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase" }}>
            Pago
          </span>
          <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: color.ink800 }}>
            {order.payment_method}
          </span>
        </div>
      )}

      {/* User notes */}
      {order.notes && (
        <div style={{ background: "#fff", border: `1px solid ${color.border}`, borderRadius: radius.sm, padding: "12px 16px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, marginBottom: 6, textTransform: "uppercase" }}>
            Tus notas
          </div>
          <div style={{ fontFamily: font.body, fontSize: 14, color: color.ink700, lineHeight: 1.5 }}>{order.notes}</div>
        </div>
      )}

      {/* Admin notes */}
      {order.admin_notes && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: radius.sm, padding: "12px 16px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: "#92400e", marginBottom: 6, textTransform: "uppercase" }}>
            Respuesta del equipo
          </div>
          <div style={{ fontFamily: font.body, fontSize: 14, color: "#78350f", lineHeight: 1.5 }}>{order.admin_notes}</div>
        </div>
      )}

      {/* Items */}
      <div>
        <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, marginBottom: 10, textTransform: "uppercase" }}>
          Ítems
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#fff",
                border: `1px solid ${color.border}`,
                borderRadius: radius.sm,
              }}
            >
              <div>
                <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink900 }}>
                  {item.name_snapshot}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, marginTop: 2 }}>
                  SKU {item.sku_snapshot}
                  {item.unit_price_snapshot != null && (
                    <> · {formatPrice(item.unit_price_snapshot)} c/u</>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: color.ink900 }}>
                  {item.unit_price_snapshot != null
                    ? formatPrice(item.unit_price_snapshot * item.quantity)
                    : "—"}
                </div>
                <div style={{ fontFamily: font.body, fontSize: 11, color: color.textFaint }}>
                  ×{item.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      {total > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px",
          background: color.primarySoft,
          borderRadius: radius.sm,
        }}>
          <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.primaryDark }}>Total estimado</span>
          <span style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 800, color: color.primary }}>
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

export function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // State for create modal to drive its footer
  const [createNotes, setCreateNotes] = useState("");
  const [createItems, setCreateItems] = useState<DraftItem[]>([]);
  const [createSearch, setCreateSearch] = useState("");
  const [createSearchResults, setCreateSearchResults] = useState<Product[]>([]);
  const [createSearching, setCreateSearching] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (p: number) => {
    setOrders(null);
    try {
      const data = await orderApi.mine({ skip: p * PAGE_SIZE, limit: PAGE_SIZE });
      setOrders(data.items);
      setTotal(data.total);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => { fetchOrders(page); }, [fetchOrders, page]);

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
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const payload: OrderCreate = {
        notes: createNotes.trim() || null,
        items: createItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      };
      await orderApi.create(payload);
      setShowCreate(false);
      setCreateItems([]);
      setCreateNotes("");
      fetchOrders(0);
      setPage(0);
    } catch {
      setCreateError("No se pudo crear el pedido. Intentá de nuevo.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      const updated = await orderApi.cancelMine(selected.id);
      setSelected(updated);
      setConfirmCancel(false);
      fetchOrders(page);
    } catch {
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${color.border}`,
    borderRadius: radius.sm,
    fontFamily: font.body,
    fontSize: 14,
    color: color.ink900,
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900, margin: 0 }}>
          Mis pedidos
        </h1>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo pedido</Button>
      </div>

      {/* List */}
      {orders === null ? (
        <CenteredSpinner label="Cargando pedidos…" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No tenés pedidos todavía"
          message="Creá tu primer pedido para solicitar productos directamente a nuestro equipo."
          action={<Button onClick={() => setShowCreate(true)}>Crear pedido</Button>}
        />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        loading={cancelling}
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
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setCreateItems([]); setCreateNotes(""); setCreateError(null); }} disabled={createSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createSubmitting || createItems.length === 0}>
              {createSubmitting ? "Enviando…" : "Crear pedido"}
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Buscador */}
          <div>
            <label style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink700, display: "block", marginBottom: 6 }}>
              Buscar producto
            </label>
            <input
              style={inputStyle}
              placeholder="Nombre o SKU…"
              value={createSearch}
              onChange={(e) => setCreateSearch(e.target.value)}
              autoFocus
            />
            {(createSearching || createSearchResults.length > 0) && (
              <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.sm, marginTop: 4, overflow: "hidden", background: "#fff" }}>
                {createSearching ? (
                  <div style={{ padding: "10px 14px", fontFamily: font.body, fontSize: 13, color: color.textFaint }}>Buscando…</div>
                ) : createSearchResults.length === 0 ? (
                  <div style={{ padding: "10px 14px", fontFamily: font.body, fontSize: 13, color: color.textFaint }}>Sin resultados</div>
                ) : createSearchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "10px 14px",
                      background: "none", border: "none",
                      borderBottom: `1px solid ${color.border}`,
                      cursor: "pointer", textAlign: "left",
                      transition: "background .1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = color.primarySoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  >
                    <span style={{ fontFamily: font.body, fontSize: 14, color: color.ink900 }}>{p.name}</span>
                    <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>SKU {p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items draft */}
          {createItems.length > 0 && (
            <div>
              <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: color.textFaint, marginBottom: 8, textTransform: "uppercase" }}>
                Ítems agregados
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {createItems.map(({ product, quantity }) => (
                  <div key={product.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px",
                    background: color.surface,
                    border: `1px solid ${color.border}`,
                    borderRadius: radius.sm,
                  }}>
                    <span style={{ fontFamily: font.body, fontSize: 14, color: color.ink900, flex: 1 }}>{product.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => updateQty(product.id, quantity - 1)} style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${color.border}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>−</button>
                      <span style={{ fontFamily: font.mono, fontSize: 14, minWidth: 24, textAlign: "center" }}>{quantity}</span>
                      <button onClick={() => updateQty(product.id, quantity + 1)} style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${color.border}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>+</button>
                    </div>
                    <button onClick={() => updateQty(product.id, 0)} style={{ background: "none", border: "none", cursor: "pointer", color: color.textFaint, fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink700, display: "block", marginBottom: 6 }}>
              Notas <span style={{ fontWeight: 400, color: color.textFaint }}>(opcional)</span>
            </label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
              placeholder="Aclaraciones, vehículo, urgencia…"
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
            />
          </div>

          {createError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: radius.sm, padding: "10px 14px", fontFamily: font.body, fontSize: 13, color: "#b91c1c" }}>
              {createError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
