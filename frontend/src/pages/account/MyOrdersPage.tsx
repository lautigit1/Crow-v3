import { useEffect, useState, useCallback } from "react";
import { CenteredSpinner, EmptyState, Button } from "@/shared/ui";
import { orderApi, ORDER_STATUS_COLOR, type Order, type OrderCreate } from "@/entities/order";
import { productApi, type Product } from "@/entities/product";
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
// Order card
// ---------------------------------------------------------------------------
function OrderCard({ order, onExpand }: { order: Order; onExpand: () => void }) {
  const total = order.items.reduce(
    (acc, item) => acc + (item.unit_price_snapshot ?? 0) * item.quantity,
    0,
  );
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${color.border}`,
        borderRadius: radius.md,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
      }}
      onClick={onExpand}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: color.ink900 }}>
          Pedido #{order.id}
        </span>
        <span style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint }}>
          {new Date(order.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
          {" · "}
          {order.items.length} ítem{order.items.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {total > 0 && (
          <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: 14, color: color.ink900 }}>
            ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        )}
        <StatusBadge status={order.status} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order detail drawer
// ---------------------------------------------------------------------------
function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(480px, 100vw)",
          background: "#fff",
          height: "100%",
          overflowY: "auto",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: color.ink900, margin: 0 }}>
            Pedido #{order.id}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: color.textFaint }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge status={order.status} />
          <span style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint, alignSelf: "center" }}>
            {new Date(order.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>

        {order.notes && (
          <div style={{ background: color.surface, borderRadius: radius.sm, padding: "10px 14px" }}>
            <div style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint, marginBottom: 4 }}>NOTAS</div>
            <div style={{ fontFamily: font.body, fontSize: 14, color: color.ink700 }}>{order.notes}</div>
          </div>
        )}

        {order.admin_notes && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: radius.sm, padding: "10px 14px" }}>
            <div style={{ fontFamily: font.body, fontSize: 12, color: "#92400e", marginBottom: 4 }}>RESPUESTA DEL EQUIPO</div>
            <div style={{ fontFamily: font.body, fontSize: 14, color: "#78350f" }}>{order.admin_notes}</div>
          </div>
        )}

        <div>
          <div style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint, marginBottom: 10 }}>ÍTEMS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {order.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: color.surface,
                  borderRadius: radius.sm,
                }}
              >
                <div>
                  <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink900 }}>{item.name_snapshot}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>SKU {item.sku_snapshot}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: color.ink900 }}>
                    {item.unit_price_snapshot != null
                      ? `$${(item.unit_price_snapshot * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: color.textFaint }}>x{item.quantity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create order modal
// ---------------------------------------------------------------------------
type DraftItem = { product: Product; quantity: number };

function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await productApi.list({ q, limit: 8, in_stock: false });
      setSearchResults(res.items.filter((p) => !p.is_deleted));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setSearch("");
    setSearchResults([]);
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) { setError("Agregá al menos un producto"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const payload: OrderCreate = {
        notes: notes.trim() || null,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      };
      await orderApi.create(payload);
      onCreated();
      onClose();
    } catch {
      setError("No se pudo crear el pedido. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${color.border}`,
    borderRadius: radius.sm,
    fontFamily: font.body,
    fontSize: 14,
    color: color.ink900,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: radius.md, padding: 28, width: "min(520px, 96vw)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: color.ink900, margin: 0 }}>Nuevo pedido</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: color.textFaint }}>×</button>
        </div>

        {/* Product search */}
        <div>
          <label style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink700, display: "block", marginBottom: 6 }}>
            Buscar producto
          </label>
          <input
            style={inputStyle}
            placeholder="Nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(searching || searchResults.length > 0) && (
            <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.sm, marginTop: 4, overflow: "hidden" }}>
              {searching ? (
                <div style={{ padding: "10px 14px", fontFamily: font.body, fontSize: 13, color: color.textFaint }}>Buscando…</div>
              ) : searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "10px 14px", background: "none", border: "none",
                    borderBottom: `1px solid ${color.border}`, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: font.body, fontSize: 14, color: color.ink900 }}>{p.name}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>SKU {p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Draft items */}
        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint }}>ÍTEMS AGREGADOS</div>
            {items.map(({ product, quantity }) => (
              <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: color.surface, borderRadius: radius.sm }}>
                <span style={{ fontFamily: font.body, fontSize: 14, color: color.ink900, flex: 1 }}>{product.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => updateQty(product.id, quantity - 1)} style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${color.border}`, background: "#fff", cursor: "pointer", fontWeight: 700 }}>−</button>
                  <span style={{ fontFamily: font.mono, fontSize: 14, minWidth: 24, textAlign: "center" }}>{quantity}</span>
                  <button onClick={() => updateQty(product.id, quantity + 1)} style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${color.border}`, background: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
                </div>
                <button onClick={() => updateQty(product.id, 0)} style={{ background: "none", border: "none", cursor: "pointer", color: color.textFaint, fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div>
          <label style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink700, display: "block", marginBottom: 6 }}>
            Notas (opcional)
          </label>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
            placeholder="Aclaraciones, vehículo, urgencia…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: radius.sm, padding: "10px 14px", fontFamily: font.body, fontSize: 13, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || items.length === 0}>
            {submitting ? "Enviando…" : "Crear pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const PAGE_SIZE = 10;

export function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900, margin: 0 }}>
          Mis pedidos
        </h1>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo pedido</Button>
      </div>

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

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", paddingTop: 8 }}>
              <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Anterior</Button>
              <span style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint, alignSelf: "center" }}>
                Página {page + 1} de {totalPages}
              </span>
              <Button variant="ghost" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</Button>
            </div>
          )}
        </>
      )}

      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => fetchOrders(0)}
        />
      )}
    </div>
  );
}
