import { Link, useNavigate } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useCart, type CartItem } from "@/app/providers/CartProvider";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { formatPrice } from "@/shared/lib/format";
import { Container, Button, Icon, ProductImage, EmptyState, ConfirmModal } from "@/shared/ui";

function CartRow({ item }: { item: CartItem }) {
  const { setQuantity, removeItem } = useCart();
  const max = Math.max(item.stock, item.quantity);
  const lineTotal = (item.price ?? 0) * item.quantity;

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border">
      <Link to={`/producto/${item.productId}`} className="shrink-0 w-16 h-16 rounded-md overflow-hidden border border-border">
        <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} />
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/producto/${item.productId}`} className="no-underline text-inherit">
          <div className="font-display font-bold text-[14.5px] text-ink900 mb-0.5">
            {item.name}
          </div>
        </Link>
        <div className="font-mono text-[11px] text-textFaint">{item.sku}</div>
        <div className="font-body text-[13px] text-textMuted mt-0.5">
          {formatPrice(item.price)} c/u
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={item.quantity <= 1}
          onClick={() => setQuantity(item.productId, item.quantity - 1)}
          className="w-7 h-7 border border-border rounded-sm bg-white cursor-pointer text-ink700 font-bold"
        >
          −
        </button>
        <span className="w-[26px] text-center font-body text-[13.5px] font-bold">
          {item.quantity}
        </span>
        <button
          type="button"
          disabled={item.quantity >= max}
          onClick={() => setQuantity(item.productId, item.quantity + 1)}
          className="w-7 h-7 border border-border rounded-sm bg-white cursor-pointer text-ink700 font-bold"
        >
          +
        </button>
      </div>

      <div className="w-[90px] text-right shrink-0 font-display font-extrabold text-[14.5px] text-ink900">
        {formatPrice(lineTotal)}
      </div>

      <button
        type="button"
        aria-label="Quitar del carrito"
        onClick={() => removeItem(item.productId)}
        className="bg-none border-none cursor-pointer text-textFaint shrink-0 p-1"
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

export function CartPage() {
  usePageMeta("Carrito", "Revisá los productos que agregaste antes de confirmar tu pedido.");
  const { items, count, subtotal, clear } = useCart();
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
    <section className="bg-surface min-h-[70vh]">
      <Container maxWidth={760} className="pt-5 pb-[60px] md:pt-8 md:pb-20">
        <h1 className="font-display font-black text-2xl md:text-[30px] text-ink900 m-0 mb-6">
          Carrito {count > 0 && <span className="text-textFaint font-bold">({count})</span>}
        </h1>

        {items.length === 0 ? (
          <EmptyState
            title="Tu carrito está vacío"
            message="Agregá productos desde el catálogo para armar tu pedido."
            action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
          />
        ) : (
          <>
            <div className="bg-white border border-border rounded-lg shadow-sm py-1 px-[18px]">
              {items.map((item) => <CartRow key={item.productId} item={item} />)}
            </div>

            <div className="flex flex-col items-stretch text-center md:flex-row md:items-center md:justify-between md:text-left gap-4 mt-6">
              <button
                type="button"
                onClick={handleClear}
                className="bg-none border-none cursor-pointer text-textFaint font-body text-[13px] font-semibold p-0 text-center md:text-left"
              >
                Vaciar carrito
              </button>

              <div className="flex items-center gap-4 justify-between md:justify-end">
                <div>
                  <div className="font-mono text-[10.5px] tracking-[.08em] text-textFaint uppercase">Subtotal</div>
                  <div className="font-display font-black text-[22px] text-primary">{formatPrice(subtotal)}</div>
                </div>
                <Button onClick={() => navigate("/checkout")}>Continuar</Button>
              </div>
            </div>

            <p className="font-body text-[12.5px] text-textFaint mt-4 text-center md:text-left">
              El pago y la entrega se coordinan al confirmar el pedido.
            </p>
          </>
        )}
      </Container>

      <ConfirmModal {...confirmProps} />
    </section>
  );
}
