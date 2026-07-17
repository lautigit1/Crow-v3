import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useCart } from "@/app/providers/CartProvider";
import { useIsOpenNow } from "@/shared/lib/useIsOpenNow";
import { formatPrice } from "@/shared/lib/format";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";
import { apiError } from "@/shared/api";
import { orderApi, PAYMENT_METHODS, PAYMENT_METHOD_HINT, type Order, type PaymentMethod } from "@/entities/order";
import { Container, Button, Textarea, Icon, ProductImage, type IconName } from "@/shared/ui";

/**
 * Rediseño premium del checkout -- ver openspec/changes/2026-07-08-cart-checkout-premium
 * y la nota equivalente en CartPage.tsx. Layout de dos columnas en
 * desktop (revisión + panel de resumen fijo `ink900`), selector de
 * método de pago con ícono + estado seleccionado, estado de éxito con
 * más presencia (número de pedido tipo "sello" mono). Segunda vuelta:
 * misma corrección de escala que CartPage.tsx (todo se sentía chico) --
 * imágenes, tipografía y contenedor subieron de tamaño para que el flujo
 * completo carrito → checkout se sienta consistente.
 */

const pad = (n: number) => String(n).padStart(2, "0");

// Asociación por sensación, no literal (no hay íconos de medios de pago
// en el set del sitio): refresh = intercambio de fondos entre cuentas,
// sparkles = billetera digital, lock = pago con tarjeta (seguridad),
// mapPin = retiro físico en el local.
const PAYMENT_ICON: Record<PaymentMethod, IconName> = {
  Transferencia: "refresh",
  "Mercado Pago": "sparkles",
  Tarjeta: "lock",
  "Retiro en local (efectivo)": "mapPin",
};

// ── Selector de método de pago ───────────────────────────────────────────────
function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod | null; onChange: (v: PaymentMethod) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PAYMENT_METHODS.map((method, i) => {
        const selected = value === method;
        return (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={clsx(
              "relative flex items-start gap-3.5 rounded-xl border-[1.5px] p-4 text-left outline-none transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected ? "border-primary bg-primarySoft" : "border-border bg-white hover:border-borderStrong"
            )}
          >
            <span className="mt-1 font-mono text-[11px] font-bold text-ink900/25">{pad(i + 1)}</span>
            <span
              className={clsx(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                selected ? "bg-primary text-white" : "bg-surface text-textFaint"
              )}
            >
              <Icon name={PAYMENT_ICON[method]} size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-body text-[15px] font-bold text-ink900">{method}</span>
              <span className="mt-0.5 block font-body text-[12.5px] leading-snug text-textFaint">
                {PAYMENT_METHOD_HINT[method]}
              </span>
            </span>
            {selected && (
              <span className="absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                <Icon name="check" size={13} strokeWidth={2.4} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Fila de revisión (solo lectura) ──────────────────────────────────────────
function ReviewRow({ item, index }: { item: { productId: number; name: string; sku: string; imageUrl: string | null; price: number | null; quantity: number }; index: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-4 last:border-b-0">
      <span className="hidden w-6 shrink-0 font-mono text-[11.5px] font-bold text-ink900/25 sm:block">{pad(index + 1)}</span>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border">
        <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-body text-[15px] font-bold text-ink900">{item.name}</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-textFaint">{item.sku} · x{item.quantity}</div>
      </div>
      <div className="shrink-0 font-display text-[16px] font-extrabold text-ink900">
        {formatPrice((item.price ?? 0) * item.quantity)}
      </div>
    </div>
  );
}

// ── Panel de resumen (sticky en desktop) ─────────────────────────────────────
function SummaryPanel({
  subtotal, count, disabled, submitting, onConfirm,
}: {
  subtotal: number; count: number; disabled: boolean; submitting: boolean; onConfirm: () => void;
}) {
  const open = useIsOpenNow();
  const contact = useSiteSettings();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink900 p-7 lg:sticky lg:top-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_340px_at_100%_0%,rgba(0,87,217,.24),transparent_65%)]" />

      <div className="relative">
        <div className="font-mono text-[11.5px] font-bold uppercase tracking-[.1em] text-[#63819C]">Resumen</div>

        <div className="mt-5 flex items-center justify-between border-t border-[rgba(255,255,255,.08)] pt-5">
          <span className="font-body text-[14px] text-[#8AA3BC]">Subtotal · {count} {count === 1 ? "ítem" : "ítems"}</span>
          <span className="font-display text-[18px] font-bold text-white">{formatPrice(subtotal)}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="font-body text-[14px] text-[#8AA3BC]">Envío / retiro</span>
          <span className="font-mono text-[13px] text-[#63819C]">A coordinar</span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[rgba(255,255,255,.08)] pt-5">
          <span className="font-display text-[15px] font-bold text-white">Total</span>
          <span className="font-display text-[32px] font-black text-white">{formatPrice(subtotal)}</span>
        </div>

        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={disabled || submitting}
          whileHover={disabled || submitting ? undefined : { y: -2, boxShadow: "0 16px 36px rgba(0,87,217,.4)" }}
          whileTap={disabled || submitting ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className={clsx(
            "mt-6 flex h-[58px] w-full items-center justify-center gap-2.5 rounded-full font-display text-[16px] font-bold outline-none transition-colors duration-150",
            disabled || submitting ? "cursor-not-allowed bg-white/10 text-white/40" : "cursor-pointer bg-primary text-white"
          )}
        >
          {submitting ? "Confirmando…" : "Confirmar pedido"}
        </motion.button>

        <p className="mt-3.5 text-center font-body text-[12.5px] leading-snug text-[#63819C]">
          Sin cobro online acá — el pago y la entrega se coordinan después.
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-[rgba(255,255,255,.08)] pt-5">
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[.06em] text-[#63819C]">
            <Icon name="shieldCheck" size={13} className="text-[#4ADE80]" /> Garantía de fábrica
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[.06em] text-[#63819C]">
            <span className={clsx("h-[6px] w-[6px] rounded-full", open ? "bg-[#4ADE80]" : "bg-[rgba(255,255,255,.3)]")} />
            {contact.address.split(",")[0]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Empty state a medida (acceso directo a /checkout sin carrito) ───────────
function EmptyCheckout() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-borderStrong bg-white px-6 py-24 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-textFaint">
        <Icon name="cart" size={32} />
      </span>
      <div>
        <h2 className="mb-2 font-display text-[24px] font-black text-ink900">Tu carrito está vacío</h2>
        <p className="mx-auto max-w-[360px] font-body text-[15px] leading-relaxed text-textMuted">
          Agregá productos desde el catálogo antes de confirmar un pedido.
        </p>
      </div>
      <Button as={Link} to="/catalogo" size="lg">Ir al catálogo</Button>
    </div>
  );
}

// ── Éxito ─────────────────────────────────────────────────────────────────────
function OrderSuccess({ order }: { order: Order }) {
  const waLink = useWaLink();
  const waMsg = `Hola Crow! Acabo de hacer el Pedido #${order.id}. ¿Cómo seguimos con el pago y la entrega?`;
  const steps = [
    "Un asesor real revisa tu pedido y confirma stock y precio.",
    order.payment_method ? <>Coordinamos el pago por <strong className="text-ink900">{order.payment_method}</strong>.</> : "Coordinamos el método de pago.",
    "Acordamos entrega en Mendoza o retiro en el local.",
  ];

  return (
    <section className="flex min-h-[70vh] items-center bg-surface">
      <Container maxWidth={620}>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-[0_1px_3px_rgba(13,23,40,.05)] md:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-successSoft text-success">
            <Icon name="check" size={28} strokeWidth={2.6} />
          </div>

          <div className="mb-2 font-mono text-[12px] font-bold uppercase tracking-[.14em] text-textFaint">
            Pedido confirmado
          </div>
          <h1 className="mb-7 font-display text-[46px] font-black leading-none tracking-[-.02em] text-ink900">
            N.º {String(order.id).padStart(5, "0")}
          </h1>

          <div className="mb-8 flex flex-col gap-4 border-y border-border py-6 text-left">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <span className="mt-0.5 font-mono text-[11.5px] font-bold text-primary">{pad(i + 1)}</span>
                <p className="m-0 font-body text-[15px] leading-snug text-textMuted">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3.5">
            <Button as="a" href={waLink(waMsg)} target="_blank" rel="noreferrer" variant="whatsapp" size="lg">
              Coordinar por WhatsApp
            </Button>
            <Button as={Link} to="/cuenta/pedidos" variant="outline" size="lg">
              Ver mis pedidos
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function CheckoutPage() {
  usePageMeta("Confirmar pedido", "Revisá y confirmá tu pedido en Crow Repuestos.");
  const { items, count, subtotal, clear } = useCart();

  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  const handleConfirm = async () => {
    if (!paymentMethod) {
      setError("Elegí un método de pago para continuar.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await orderApi.create({
        notes: notes.trim() || null,
        payment_method: paymentMethod,
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      });
      setOrder(created);
      clear();
    } catch (err) {
      setError(apiError(err, "No se pudo confirmar el pedido. Intentá de nuevo."));
    } finally {
      setSubmitting(false);
    }
  };

  // Éxito -- se muestra incluso con el carrito ya vacío
  if (order) return <OrderSuccess order={order} />;

  // Carrito vacío (ej. alguien entra directo a /checkout sin haber agregado nada)
  if (items.length === 0) {
    return (
      <Container maxWidth={880} className="px-4 py-20">
        <EmptyCheckout />
      </Container>
    );
  }

  return (
    <section className="min-h-[70vh] bg-surface">
      <Container maxWidth={1080} className="pb-[70px] pt-8 md:pb-28 md:pt-12">
        <div className="mb-9">
          <div className="mb-2 font-mono text-[12px] font-bold uppercase tracking-[.14em] text-primary">
            Último paso
          </div>
          <h1 className="font-display text-[34px] font-black tracking-[-.02em] text-ink900 md:text-[42px]">
            Confirmar pedido
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px] lg:items-start lg:gap-9">
          {/* ── Columna izquierda: revisión + pago + notas ── */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-3 font-mono text-[11.5px] font-bold uppercase tracking-[.08em] text-textFaint">
                Tu pedido
              </div>
              <div className="rounded-2xl border border-border bg-white px-5 shadow-[0_1px_3px_rgba(13,23,40,.05)] sm:px-6">
                {items.map((item, i) => (
                  <ReviewRow key={item.productId} item={item} index={i} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 font-mono text-[11.5px] font-bold uppercase tracking-[.08em] text-textFaint">
                Método de pago
              </div>
              <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            <div>
              <div className="mb-3 font-mono text-[11.5px] font-bold uppercase tracking-[.08em] text-textFaint">
                Notas (opcional)
              </div>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Ej: preferencia de horario de entrega, aclaraciones del vehículo, etc."
                className="box-border w-full"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 border-l-[3px] border-danger py-1 pl-3">
                <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-danger" />
                <p className="m-0 font-body text-[14px] leading-snug text-ink900">{error}</p>
              </div>
            )}

            <Link to="/carrito" className="font-body text-[13.5px] font-semibold text-textFaint no-underline transition-colors hover:text-ink900">
              ← Volver al carrito
            </Link>
          </div>

          {/* ── Columna derecha: resumen ── */}
          <SummaryPanel
            subtotal={subtotal}
            count={count}
            disabled={!paymentMethod}
            submitting={submitting}
            onConfirm={handleConfirm}
          />
        </div>
      </Container>
    </section>
  );
}
