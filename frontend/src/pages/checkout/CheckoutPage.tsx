import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { useCart } from "@/app/providers/CartProvider";
import { formatPrice } from "@/shared/lib/format";
import { waLink } from "@/shared/config/contact";
import { apiError } from "@/shared/api/client";
import { orderApi, PAYMENT_METHODS, PAYMENT_METHOD_HINT, type Order, type PaymentMethod } from "@/entities/order";
import { Container, Button, Textarea, ProductImage, EmptyState } from "@/shared/ui";
import { color, font, radius, shadow } from "@/shared/config/theme";

function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (v: PaymentMethod) => void;
}) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PAYMENT_METHODS.map((method) => {
          const selected = value === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onChange(method)}
              style={{
                textAlign: "left", padding: "12px 14px", cursor: "pointer",
                borderRadius: radius.md,
                border: `1.5px solid ${selected ? color.primary : color.border}`,
                background: selected ? color.primarySoft : "#fff",
                fontFamily: font.body, fontSize: 13.5, fontWeight: 700,
                color: selected ? color.primary : color.ink800,
                transition: "border-color .15s, background .15s",
              }}
            >
              {method}
            </button>
          );
        })}
      </div>
      {value && (
        <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.textFaint, margin: "10px 0 0" }}>
          {PAYMENT_METHOD_HINT[value]}
        </p>
      )}
    </div>
  );
}

export function CheckoutPage() {
  usePageMeta("Confirmar pedido", "Revisá y confirmá tu pedido en Crow Repuestos.");
  const { items, subtotal, clear } = useCart();
  const { isMobile } = useBreakpoint();

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
      <section style={{ background: color.surface, minHeight: "70vh", display: "flex", alignItems: "center" }}>
        <Container maxWidth={560}>
          <div style={{
            background: "#fff", border: `1px solid ${color.border}`, borderRadius: radius.lg,
            boxShadow: shadow.sm, padding: isMobile ? 28 : 40, textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: color.successSoft,
              color: color.success, display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 26,
            }}>
              ✓
            </div>
            <h1 style={{ fontFamily: font.display, fontWeight: 900, fontSize: 24, color: color.ink900, margin: "0 0 8px" }}>
              ¡Pedido #{order.id} creado!
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 14.5, color: color.textMuted, lineHeight: 1.6, margin: "0 0 28px" }}>
              Nuestro equipo va a coordinar con vos el pago
              {order.payment_method ? <> por <strong>{order.payment_method}</strong></> : ""} y la entrega.
              También podés escribirnos directamente por WhatsApp para acelerar el proceso.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
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
      <Container style={{ padding: "80px 16px" }}>
        <EmptyState
          title="Tu carrito está vacío"
          message="Agregá productos desde el catálogo antes de confirmar un pedido."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      </Container>
    );
  }

  return (
    <section style={{ background: color.surface, minHeight: "70vh" }}>
      <Container maxWidth={640} style={{ padding: isMobile ? "20px 16px 60px" : "32px 40px 80px" }}>
        <h1 style={{ fontFamily: font.display, fontWeight: 900, fontSize: isMobile ? 24 : 30, color: color.ink900, margin: "0 0 24px" }}>
          Confirmar pedido
        </h1>

        {/* Resumen (solo lectura) */}
        <div style={{ background: "#fff", border: `1px solid ${color.border}`, borderRadius: radius.lg, boxShadow: shadow.sm, padding: "6px 18px", marginBottom: 20 }}>
          {items.map((item) => (
            <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: radius.sm, overflow: "hidden", border: `1px solid ${color.border}` }}>
                <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: font.body, fontWeight: 700, fontSize: 13.5, color: color.ink900 }}>{item.name}</div>
                <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{item.sku} · x{item.quantity}</div>
              </div>
              <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 14, color: color.ink900, flexShrink: 0 }}>
                {formatPrice((item.price ?? 0) * item.quantity)}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
            <span style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".08em", color: color.textFaint, textTransform: "uppercase" }}>Subtotal</span>
            <span style={{ fontFamily: font.display, fontWeight: 900, fontSize: 20, color: color.primary }}>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <label style={{ display: "block", fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink700, marginBottom: 6 }}>
          Método de pago
        </label>
        <div style={{ marginBottom: 20 }}>
          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
        </div>

        {/* Notas */}
        <label style={{ display: "block", fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink700, marginBottom: 6 }}>
          Notas para el pedido (opcional)
        </label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="Ej: preferencia de horario de entrega, aclaraciones del vehículo, etc."
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 16 }}
        />

        <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.textFaint, marginBottom: 20 }}>
          El pago y la entrega se coordinan después de confirmar -- no se realiza ningún cobro online acá.
        </p>

        {error && (
          <div style={{ fontFamily: font.body, fontSize: 13, color: color.danger, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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

