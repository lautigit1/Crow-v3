import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useCart } from "@/app/providers/CartProvider";
import { formatPrice } from "@/shared/lib/format";
import { waLink } from "@/shared/config/contact";
import { apiError } from "@/shared/api/client";
import { orderApi, PAYMENT_METHODS, PAYMENT_METHOD_HINT, type Order, type PaymentMethod } from "@/entities/order";
import { Container, Button, Textarea, ProductImage, EmptyState } from "@/shared/ui";

function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (v: PaymentMethod) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        {PAYMENT_METHODS.map((method) => {
          const selected = value === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onChange(method)}
              className={clsx(
                "text-left py-3 px-3.5 cursor-pointer rounded-md border-[1.5px] font-body text-[13.5px] font-bold transition-[border-color,background] duration-150",
                selected ? "border-primary bg-primarySoft text-primary" : "border-border bg-white text-ink800",
              )}
            >
              {method}
            </button>
          );
        })}
      </div>
      {value && (
        <p className="font-body text-[12.5px] text-textFaint mt-2.5 mb-0">
          {PAYMENT_METHOD_HINT[value]}
        </p>
      )}
    </div>
  );
}

export function CheckoutPage() {
  usePageMeta("Confirmar pedido", "Revisá y confirmá tu pedido en Crow Repuestos.");
  const { items, subtotal, clear } = useCart();

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
  if (order) {
    const waMsg = `Hola Crow! Acabo de hacer el Pedido #${order.id}. ¿Cómo seguimos con el pago y la entrega?`;
    return (
      <section className="bg-surface min-h-[70vh] flex items-center">
        <Container maxWidth={560}>
          <div className="bg-white border border-border rounded-lg shadow-sm p-7 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-successSoft text-success flex items-center justify-center mx-auto mb-5 text-[26px]">
              ✓
            </div>
            <h1 className="font-display font-black text-2xl text-ink900 m-0 mb-2">
              ¡Pedido #{order.id} creado!
            </h1>
            <p className="font-body text-[14.5px] text-textMuted leading-[1.6] m-0 mb-7">
              Nuestro equipo va a coordinar con vos el pago
              {order.payment_method ? <> por <strong>{order.payment_method}</strong></> : ""} y la entrega.
              También podés escribirnos directamente por WhatsApp para acelerar el proceso.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button as="a" href={waLink(waMsg)} target="_blank" rel="noreferrer" variant="whatsapp">
                Coordinar por WhatsApp
              </Button>
              <Button as={Link} to="/cuenta/pedidos" variant="outline">
                Ver mis pedidos
              </Button>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // Carrito vacío (ej. alguien entra directo a /checkout sin haber agregado nada)
  if (items.length === 0) {
    return (
      <Container className="py-20 px-4">
        <EmptyState
          title="Tu carrito está vacío"
          message="Agregá productos desde el catálogo antes de confirmar un pedido."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      </Container>
    );
  }

  return (
    <section className="bg-surface min-h-[70vh]">
      <Container maxWidth={640} className="pt-5 pb-[60px] md:pt-8 md:pb-20">
        <h1 className="font-display font-black text-2xl md:text-[30px] text-ink900 m-0 mb-6">
          Confirmar pedido
        </h1>

        {/* Resumen (solo lectura) */}
        <div className="bg-white border border-border rounded-lg shadow-sm py-1.5 px-[18px] mb-5">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3 py-3 border-b border-border">
              <div className="w-12 h-12 shrink-0 rounded-sm overflow-hidden border border-border">
                <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-body font-bold text-[13.5px] text-ink900">{item.name}</div>
                <div className="font-mono text-[11px] text-textFaint">{item.sku} · x{item.quantity}</div>
              </div>
              <div className="font-display font-extrabold text-sm text-ink900 shrink-0">
                {formatPrice((item.price ?? 0) * item.quantity)}
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center py-3.5">
            <span className="font-mono text-[11px] tracking-[.08em] text-textFaint uppercase">Subtotal</span>
            <span className="font-display font-black text-xl text-primary">{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <label className="block font-body text-[13px] font-semibold text-ink700 mb-1.5">
          Método de pago
        </label>
        <div className="mb-5">
          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
        </div>

        {/* Notas */}
        <label className="block font-body text-[13px] font-semibold text-ink700 mb-1.5">
          Notas para el pedido (opcional)
        </label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="Ej: preferencia de horario de entrega, aclaraciones del vehículo, etc."
          className="w-full box-border mb-4"
        />

        <p className="font-body text-[12.5px] text-textFaint mb-5">
          El pago y la entrega se coordinan después de confirmar -- no se realiza ningún cobro online acá.
        </p>

        {error && (
          <div className="font-body text-[13px] text-danger mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleConfirm} disabled={submitting || !paymentMethod}>
            {submitting ? "Confirmando…" : "Confirmar pedido"}
          </Button>
          <Button as={Link} to="/carrito" variant="ghost">
            Volver al carrito
          </Button>
        </div>
      </Container>
    </section>
  );
}
