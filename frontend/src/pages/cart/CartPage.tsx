import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useCart, type CartItem } from "@/app/providers/CartProvider";
import { useConfirm } from "@/shared/lib/useConfirm";
import { formatPrice } from "@/shared/lib/format";
import { Container, Button, Icon, ProductImage, ConfirmModal } from "@/shared/ui";

/**
 * Rediseño premium del carrito -- pedido explícito del usuario ("un
 * estilo mucho más premium al carrito o checkout"). Reusa el vocabulario
 * visual ya construido en el resto del sitio (índice mono, panel
 * `ink900` con propósito real, botón con micro-interacción) en vez del
 * lenguaje genérico que tenía antes (tarjeta blanca lisa, stepper en
 * cajas cuadradas, subtotal como texto suelto). Ver
 * openspec/changes/2026-07-08-cart-checkout-premium (segunda vuelta: el
 * usuario marcó que todo se sentía chico -- imágenes, tipografía y
 * espaciados subieron de escala en esta pasada, y el contenedor pasó de
 * 780 a 880px para que la tarjeta no flote perdida en el ancho de la
 * pantalla).
 */

const pad = (n: number) => String(n).padStart(2, "0");
const EASE = [0.22, 1, 0.36, 1] as const;

// ── Stepper de cantidad ───────────────────────────────────────────────────────
function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex h-11 shrink-0 items-center overflow-hidden rounded-full border border-border bg-white">
      <button
        type="button"
        aria-label="Restar uno"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="flex h-11 w-11 items-center justify-center bg-transparent text-ink700 outline-none transition-colors hover:bg-surface disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <Icon name="minus" size={15} />
      </button>
      <span className="w-9 text-center font-mono text-[15px] font-bold text-ink900">{value}</span>
      <button
        type="button"
        aria-label="Sumar uno"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center bg-transparent text-ink700 outline-none transition-colors hover:bg-surface disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      >
        <Icon name="plus" size={15} />
      </button>
    </div>
  );
}

// ── Fila de producto ──────────────────────────────────────────────────────────
function CartRow({ item, index }: { item: CartItem; index: number }) {
  const { setQuantity, removeItem } = useCart();
  const max = Math.max(item.stock, item.quantity);
  const lineTotal = (item.price ?? 0) * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-5 border-b border-border py-5 last:border-b-0">
        <span className="hidden w-7 shrink-0 font-mono text-[12.5px] font-bold text-ink900/25 sm:block">
          {pad(index + 1)}
        </span>

        <Link to={`/producto/${item.productId}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border">
          <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} compact />
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={`/producto/${item.productId}`} className="text-inherit no-underline">
            <div className="mb-1 truncate font-display text-[17px] font-bold text-ink900">{item.name}</div>
          </Link>
          <div className="font-mono text-[11.5px] text-textFaint">{item.sku}</div>
          <div className="mt-1 font-body text-[14px] text-textMuted">{formatPrice(item.price)} c/u</div>
        </div>

        <Stepper value={item.quantity} max={max} onChange={(v) => setQuantity(item.productId, v)} />

        <div className="w-[112px] shrink-0 text-right font-display text-[18px] font-extrabold text-ink900">
          {formatPrice(lineTotal)}
        </div>

        <button
          type="button"
          aria-label="Quitar del carrito"
          onClick={() => removeItem(item.productId)}
          className="shrink-0 rounded-full bg-transparent p-2 text-ink900/25 outline-none transition-colors hover:text-danger focus-visible:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-borderStrong bg-white px-6 py-24 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-textFaint">
        <Icon name="cart" size={32} />
      </span>
      <div>
        <h2 className="mb-2 font-display text-[24px] font-black text-ink900">Tu carrito está vacío</h2>
        <p className="mx-auto max-w-[360px] font-body text-[15px] leading-relaxed text-textMuted">
          Agregá productos desde el catálogo para armar tu pedido.
        </p>
      </div>
      <Button as={Link} to="/catalogo" size="lg">
        Ir al catálogo
      </Button>
    </div>
  );
}

// ── Panel de resumen ─────────────────────────────────────────────────────────
function SummaryPanel({ count, subtotal, onContinue }: { count: number; subtotal: number; onContinue: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink900 p-7 md:p-9">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(560px_340px_at_100%_0%,rgba(0,87,217,.24),transparent_65%)]" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 font-mono text-[11.5px] uppercase tracking-[.08em] text-[#63819C]">
            Subtotal · {count} {count === 1 ? "ítem" : "ítems"}
          </div>
          <div className="font-display text-[36px] font-black leading-none text-white sm:text-[42px]">
            {formatPrice(subtotal)}
          </div>
          <div className="mt-2.5 font-body text-[13.5px] text-[#63819C]">
            El pago y la entrega se coordinan al confirmar el pedido.
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onContinue}
          whileHover={{ y: -2, boxShadow: "0 16px 36px rgba(0,87,217,.4)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="flex h-[58px] shrink-0 items-center justify-center gap-3 rounded-full bg-primary px-9 font-display text-[16px] font-bold text-white outline-none"
        >
          Continuar
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </motion.button>
      </div>
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
    <section className="min-h-[70vh] bg-surface">
      <Container maxWidth={880} className="pb-[70px] pt-8 md:pb-28 md:pt-12">
        <div className="mb-9 flex items-end justify-between">
          <div>
            <div className="mb-2 font-mono text-[12px] font-bold uppercase tracking-[.14em] text-primary">
              Tu pedido
            </div>
            <h1 className="font-display text-[34px] font-black tracking-[-.02em] text-ink900 md:text-[42px]">
              Carrito
            </h1>
          </div>
          {count > 0 && (
            <span className="font-mono text-[12px] font-bold uppercase tracking-[.06em] text-textFaint">
              {pad(count)} {count === 1 ? "ítem" : "ítems"}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-white px-6 shadow-[0_1px_3px_rgba(13,23,40,.05)] sm:px-8">
              <AnimatePresence initial={false}>
                {items.map((item, i) => (
                  <CartRow key={item.productId} item={item} index={i} />
                ))}
              </AnimatePresence>
            </div>

            <div className="mb-7 mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="border-none bg-transparent p-0 font-body text-[13.5px] font-semibold text-textFaint outline-none transition-colors hover:text-danger"
              >
                Vaciar carrito
              </button>
            </div>

            <SummaryPanel count={count} subtotal={subtotal} onContinue={() => navigate("/checkout")} />
          </>
        )}
      </Container>

      <ConfirmModal {...confirmProps} />
    </section>
  );
}
