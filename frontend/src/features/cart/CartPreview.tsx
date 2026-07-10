import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Dropdown, Icon, ProductImage, Button } from "@/shared/ui";
import { useCart, type CartItem } from "@/app/providers/CartProvider";
import { formatPrice } from "@/shared/lib/format";

/**
 * Mini-carrito desplegable -- pedido explícito del usuario: "una pestaña
 * de carrito provisional, que se despliegue en algún lado así como el
 * buscador". Reusa `Dropdown` (mismo patrón que `AccountMenu`): el ícono
 * de carrito de la navbar deja de navegar directo a /carrito y en su
 * lugar abre esta vista previa in-place. Ver
 * openspec/changes/2026-07-08-cart-checkout-premium (segunda vuelta:
 * el usuario marcó dos problemas sobre la primera versión -- el botón
 * disparador se veía blanco, y todo el contenido del panel se sentía
 * chico. Ver `tasks.md` para el detalle de ambas correcciones).
 */

// ── Trigger ───────────────────────────────────────────────────────────────────
// `bg-transparent` es obligatorio acá: Preflight está apagado en este
// proyecto (tailwind.config.js), así que un <button> sin fondo propio
// muestra el fondo por defecto del navegador (blanco/gris) en vez de
// quedar transparente -- exactamente el bug que reportó el usuario
// ("el boton del carrito esta blanco"). Mismo problema, mismo fix que ya
// se aplicó en `ActionRow`/`MobileDock` de la navbar.
function Trigger({ open, count }: { open: boolean; count: number }) {
  return (
    <button
      aria-label="Ver carrito"
      className={clsx(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full outline-none [transition:background-color_.14s,color_.14s] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF]",
        open ? "bg-[rgba(255,255,255,.08)] text-white" : "bg-transparent text-[rgba(255,255,255,.7)] hover:bg-[rgba(255,255,255,.08)] hover:text-white"
      )}
    >
      <Icon name="cart" size={17} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-ink900 bg-primary px-[3px] font-mono text-[9.5px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────
function PreviewRow({ item, onRemove, onNavigate }: { item: CartItem; onRemove: () => void; onNavigate: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: "hidden" }}
    >
      <div className="flex items-center gap-3.5 py-3.5">
        <Link
          to={`/producto/${item.productId}`}
          onClick={onNavigate}
          className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border"
        >
          <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} compact />
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={`/producto/${item.productId}`} onClick={onNavigate} className="no-underline text-inherit">
            <div className="truncate font-display text-[14px] font-bold text-ink900">{item.name}</div>
          </Link>
          <div className="mt-0.5 font-mono text-[11px] text-textFaint">
            {item.quantity} × {formatPrice(item.price)}
          </div>
        </div>

        <div className="shrink-0 font-display text-[14.5px] font-extrabold text-ink900">
          {formatPrice((item.price ?? 0) * item.quantity)}
        </div>

        <button
          type="button"
          aria-label="Quitar del carrito"
          onClick={onRemove}
          className="shrink-0 rounded-full bg-transparent p-1.5 text-ink900/30 outline-none transition-colors hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export function CartPreview() {
  const { items, count, subtotal, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <Dropdown width={420} trigger={(open) => <Trigger open={open} count={count} />}>
      {(close) => (
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between px-1.5 py-2.5">
            <span className="font-display text-[16px] font-bold text-ink900">Carrito</span>
            {count > 0 && (
              <span className="font-mono text-[11px] font-bold uppercase tracking-[.06em] text-textFaint">
                {count} {count === 1 ? "ítem" : "ítems"}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 px-4 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-textFaint">
                <Icon name="cart" size={20} />
              </span>
              <div>
                <div className="font-body text-[14px] font-semibold text-ink900">Tu carrito está vacío</div>
                <div className="mt-1 font-body text-[12.5px] text-textFaint">Agregá productos desde el catálogo.</div>
              </div>
              <Button as={Link} to="/catalogo" size="sm" onClick={close}>
                Ir al catálogo
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[340px] overflow-y-auto px-1.5">
                <AnimatePresence initial={false}>
                  {items.map((item, i) => (
                    <div key={item.productId} className={i > 0 ? "border-t border-border" : ""}>
                      <PreviewRow item={item} onRemove={() => removeItem(item.productId)} onNavigate={close} />
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-1.5 border-t border-border px-1.5 pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-textFaint">Subtotal</span>
                  <span className="font-display text-[22px] font-black text-ink900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex gap-2.5">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => { close(); navigate("/carrito"); }}
                  >
                    Ver carrito
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => { close(); navigate("/checkout"); }}
                  >
                    Finalizar compra
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Dropdown>
  );
}
