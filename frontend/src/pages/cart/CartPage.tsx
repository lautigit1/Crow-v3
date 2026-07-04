import { Link, useNavigate } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { useCart, type CartItem } from "@/app/providers/CartProvider";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { formatPrice } from "@/shared/lib/format";
import { Container, Button, Icon, ProductImage, EmptyState, ConfirmModal } from "@/shared/ui";
import { color, font, radius, shadow } from "@/shared/config/theme";

function CartRow({ item }: { item: CartItem }) {
  const { setQuantity, removeItem } = useCart();
  const max = Math.max(item.stock, item.quantity);
  const lineTotal = (item.price ?? 0) * item.quantity;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 0", borderBottom: `1px solid ${color.border}`,
    }}>
      <Link to={`/producto/${item.productId}`} style={{ flexShrink: 0, width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", border: `1px solid ${color.border}` }}>
        <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} />
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Link to={`/producto/${item.productId}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, color: color.ink900, marginBottom: 2 }}>
            {item.name}
          </div>
        </Link>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{item.sku}</div>
        <div style={{ fontFamily: font.body, fontSize: 13, color: color.textMuted, marginTop: 2 }}>
          {formatPrice(item.price)} c/u
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          disabled={item.quantity <= 1}
          onClick={() => setQuantity(item.productId, item.quantity - 1)}
          style={{ width: 28, height: 28, border: `1px solid ${color.border}`, borderRadius: radius.sm, background: "#fff", cursor: "pointer", color: color.ink700, fontWeight: 700 }}
        >
          −
        </button>
        <span style={{ width: 26, textAlign: "center", fontFamily: font.body, fontSize: 13.5, fontWeight: 700 }}>
          {item.quantity}
        </span>
        <button
          type="button"
          disabled={item.quantity >= max}
          onClick={() => setQuantity(item.productId, item.quantity + 1)}
          style={{ width: 28, height: 28, border: `1px solid ${color.border}`, borderRadius: radius.sm, background: "#fff", cursor: "pointer", color: color.ink700, fontWeight: 700 }}
        >
          +
        </button>
      </div>

      <div style={{ width: 90, textAlign: "right", flexShrink: 0, fontFamily: font.display, fontWeight: 800, fontSize: 14.5, color: color.ink900 }}>
        {formatPrice(lineTotal)}
      </div>

      <button
        type="button"
        aria-label="Quitar del carrito"
        onClick={() => removeItem(item.productId)}
        style={{ background: "none", border: "none", cursor: "pointer", color: color.textFaint, flexShrink: 0, padding: 4 }}
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

export function CartPage() {
  usePageMeta("Carrito", "Revisá los productos que agregaste antes de confirmar tu pedido.");
  const { items, count, subtotal, clear } = useCart();
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const { askConfirm, confirmProps } = useConfirm();

  const handleClear = async () => {
    const ok = await askConfirm({
      title: "¿Vaciar carrito?",
      message: "Se van a quitar todos los productos que agregaste.",
      confirmLabel: "Sí, vaciar",
      danger: true,
    });
    if (ok) clear();
  };

  return (
    <section style={{ background: color.surface, minHeight: "70vh" }}>
      <Container maxWidth={760} style={{ padding: isMobile ? "20px 16px 60px" : "32px 40px 80px" }}>
        <h1 style={{ fontFamily: font.display, fontWeight: 900, fontSize: isMobile ? 24 : 30, color: color.ink900, margin: "0 0 24px" }}>
          Carrito {count > 0 && <span style={{ color: color.textFaint, fontWeight: 700 }}>({count})</span>}
        </h1>

        {items.length === 0 ? (
          <EmptyState
            title="Tu carrito está vacío"
            message="Agregá productos desde el catálogo para armar tu pedido."
            action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
          />
        ) : (
          <>
            <div style={{ background: "#fff", border: `1px solid ${color.border}`, borderRadius: radius.lg, boxShadow: shadow.sm, padding: "4px 18px" }}>
              {items.map((item) => <CartRow key={item.productId} item={item} />)}
            </div>

            <div style={{
              display: "flex", flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between",
              gap: 16, marginTop: 24,
            }}>
              <button
                type="button"
                onClick={handleClear}
                style={{ background: "none", border: "none", cursor: "pointer", color: color.textFaint, fontFamily: font.body, fontSize: 13, fontWeight: 600, padding: 0, textAlign: isMobile ? "center" : "left" }}
              >
                Vaciar carrito
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: isMobile ? "space-between" : "flex-end" }}>
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: ".08em", color: color.textFaint, textTransform: "uppercase" }}>Subtotal</div>
                  <div style={{ fontFamily: font.display, fontWeight: 900, fontSize: 22, color: color.primary }}>{formatPrice(subtotal)}</div>
                </div>
                <Button onClick={() => navigate("/checkout")}>Continuar</Button>
              </div>
            </div>

            <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.textFaint, marginTop: 16, textAlign: isMobile ? "center" : "left" }}>
              El pago y la entrega se coordinan al confirmar el pedido.
            </p>
          </>
        )}
      </Container>

      <ConfirmModal {...confirmProps} />
    </section>
  );
}
