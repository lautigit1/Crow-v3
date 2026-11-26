import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useCart } from "@/app/providers/CartProvider";
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


/**
 * Encabezado de sección con numeral y regla al ras.
 *
 * Antes cada bloque arrancaba con una etiqueta mono suelta flotando sobre el
 * contenido. Funcionaba, pero las tres secciones pesaban lo mismo y no se leía
 * ningún orden: parecían tres cosas sueltas apiladas. El numeral y la línea que
 * corre hasta el borde arman una secuencia -- se ve que es un paso de tres --
 * y le dan al bloque un borde superior que lo separa del anterior sin
 * necesidad de una caja más.
 */
function StepHeading({ step, children }: { step: number; children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="font-body text-[14px] font-medium tabular-nums text-primary">{step}.</span>
      <span className="font-display text-title font-medium text-ink900">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

// No hay íconos de medios de pago en el set del sitio, así que cada uno
// representa LO QUE VA A PASAR, no la marca:
//   refresh  → el movimiento de fondos entre cuentas
//   message  → el link de pago llega por WhatsApp (es lo que dice el texto
//              de abajo; `sparkles` estaba puesto como "billetera digital" y
//              no comunicaba nada)
//   lock     → el cobro con tarjeta, coordinado aparte
//   mapPin   → el retiro físico en el local
const PAYMENT_ICON: Record<PaymentMethod, IconName> = {
  Transferencia: "refresh",
  "Mercado Pago": "message",
  Tarjeta: "lock",
  "Retiro en local (efectivo)": "mapPin",
};

// ── Selector de método de pago ───────────────────────────────────────────────
function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod | null; onChange: (v: PaymentMethod) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PAYMENT_METHODS.map((method) => {
        const selected = value === method;
        return (
          <motion.button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 460, damping: 30 }}
            // El seleccionado se distingue por TRES señales a la vez: el anillo
            // de color, la elevación y el ícono en positivo. Antes solo cambiaba
            // el borde y el fondo, y en una pantalla clara esa diferencia se
            // pierde de un vistazo -- justo en la decisión que más importa
            // acertar de toda la página.
            className={clsx(
              "group relative flex items-start gap-4 overflow-hidden rounded-lg p-5 pr-11 text-left outline-none transition-[box-shadow,background-color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              selected
                ? "bg-primarySoft shadow-[0_0_0_2px_#0057D9]"
                : "bg-white shadow-[0_0_0_1px_#E2E8F0] hover:shadow-[0_0_0_1px_#CBD5E1]"
            )}
          >
            {/* La opción elegida se distingue por el anillo azul y el fondo
                primarySoft liso (antes, un degradé radial desde la esquina). */}
            <span
              className={clsx(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                selected
                  ? "bg-primary text-white"
                  : "bg-surface text-textFaint group-hover:bg-primarySoft group-hover:text-primary"
              )}
            >
              <Icon name={PAYMENT_ICON[method]} size={20} />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="block font-body text-body font-medium text-ink900">
                  {method}
                </span>
              </span>
              <span className="mt-1 block font-body text-[14px] leading-[1.45] text-textMuted">
                {PAYMENT_METHOD_HINT[method]}
              </span>
            </span>
            <span
              className={clsx(
                "absolute right-4 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full transition-all duration-200",
                selected
                  ? "scale-100 bg-primary text-white opacity-100"
                  : "scale-75 bg-transparent text-transparent opacity-0"
              )}
            >
              <Icon name="check" size={13} strokeWidth={2.6} />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Fila de revisión (solo lectura) ──────────────────────────────────────────
function ReviewRow({ item }: { item: { productId: number; name: string; sku: string; imageUrl: string | null; price: number | null; quantity: number } }) {
  return (
    <div className="flex items-center gap-5 border-b border-border/70 py-5 last:border-b-0">
      {/* La miniatura pasa de 64 a 72 y suma un halo interior: apoyada sobre el
          fondo `surface` en vez de blanco, la foto deja de flotar y el borde
          claro le da un canto definido sin encerrarla en una caja dura. */}
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        <ProductImage name={item.name} sku={item.sku} imageUrl={item.imageUrl} ratio={1} radius={0} compact />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-body text-body font-medium text-ink900">
          {item.name}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10.5px] tracking-[.02em] text-textMuted">
            {item.sku}
          </span>
          <span className="font-body text-[12.5px] text-textFaint">×{item.quantity}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[16px] font-medium tabular-nums tracking-[-.02em] text-ink900">
          {formatPrice((item.price ?? 0) * item.quantity)}
        </div>
        {/* El precio unitario solo aparece cuando hay más de una unidad, que es
            cuando el total de la fila deja de ser obvio. */}
        {item.quantity > 1 && item.price !== null && (
          <div className="mt-0.5 font-mono text-[11px] tabular-nums text-textFaint">
            {formatPrice(item.price)} c/u
          </div>
        )}
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
  const contact = useSiteSettings();
  return (
    /**
     * Panel claro, no oscuro.
     *
     * El fondo `ink900` se veía bien en una maqueta pero fallaba en lo único
     * que este panel tiene que hacer: leerse. Los textos secundarios iban en
     * #63819C sobre #0D1728 -- alrededor de 3.5:1 de contraste, por debajo del
     * mínimo AA para texto chico -- y el botón deshabilitado, en blanco al 7%,
     * quedaba prácticamente invisible justo cuando más importa que se vea (es
     * el estado que tiene la pantalla al entrar).
     *
     * En claro el contraste deja de ser un problema y la jerarquía se puede
     * armar con tamaño y peso en vez de con opacidades.
     */
    <div className="overflow-hidden rounded-lg border border-border bg-white lg:sticky lg:top-24">
      <div className="p-7">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-title font-medium text-ink900">
            Resumen
          </span>
          <span className="font-body text-[13px] text-textMuted">
            {count} {count === 1 ? "ítem" : "ítems"}
          </span>
        </div>

        <div className="mt-6 space-y-3 border-t border-border pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-body text-[14.5px] text-textMuted">Subtotal</span>
            <span className="font-display text-[16px] font-medium tabular-nums text-ink900">
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-body text-[14.5px] text-textMuted">Envío / retiro</span>
            <span className="font-body text-[13.5px] text-textFaint">A coordinar</span>
          </div>
        </div>

        {/* El total en su propia franja tintada: es el número que la persona
            vino a leer y no tiene por qué competir con las filas de arriba. */}
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-ink900 pt-5">
          <span className="font-body text-body font-medium text-ink900">
            Total
          </span>
          <span className="font-display text-[32px] font-medium leading-none tracking-[-.035em] tabular-nums text-ink900">
            {formatPrice(subtotal)}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={disabled || submitting}
          whileTap={disabled || submitting ? undefined : { scale: 0.985 }}
          className={clsx(
            "group relative mt-6 flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-sm font-body text-[16px] font-medium outline-none transition-[background-color,box-shadow,color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            disabled || submitting
              // Gris legible con borde, no un fantasma: se entiende que es un
              // botón que todavía no se puede usar, no un error de pintado.
              ? "cursor-not-allowed bg-surface text-textFaint shadow-[inset_0_0_0_1px_#E2E8F0]"
              : "cursor-pointer bg-primary text-white hover:bg-primaryDark"
          )}
        >
          <span className="relative">{submitting ? "Confirmando…" : "Confirmar pedido"}</span>
        </motion.button>

        {/* Decir POR QUÉ no se puede confirmar. Antes el botón simplemente se
            veía apagado y había que deducirlo. */}
        <p
          className={clsx(
            "mt-3.5 text-center font-body text-[13px] leading-[1.5]",
            disabled ? "font-semibold text-ink800" : "text-textMuted"
          )}
        >
          {disabled
            ? "Elegí un método de pago para continuar."
            : "Sin cobro online acá — el pago y la entrega se coordinan después."}
        </p>
      </div>

      {/* Franja al pie, a sangre dentro de la tarjeta: separa los sellos de
          confianza del bloque de decisión sin sumar otro borde suelto. */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-7 py-4">
        <span className="flex items-center gap-2 font-body text-[12.5px] font-semibold text-textMuted">
          <Icon name="shieldCheck" size={15} className="text-success" />
          Garantía de fábrica
        </span>
        <span className="flex items-center gap-2 font-body text-[12.5px] font-semibold text-textMuted">
          <Icon name="mapPin" size={15} className="text-textFaint" />
          {contact.address.split(",")[0]}
        </span>
      </div>
    </div>
  );
}

// ── Empty state a medida (acceso directo a /checkout sin carrito) ───────────
function EmptyCheckout() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-dashed border-borderStrong bg-white px-6 py-24 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-textFaint">
        <Icon name="cart" size={32} />
      </span>
      <div>
        <h2 className="mb-2 font-display text-display-sm font-medium text-ink900">Tu carrito está vacío</h2>
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
        <div className="relative overflow-hidden rounded-lg border border-border bg-white p-8 text-center md:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-successSoft text-success">
            <Icon name="check" size={28} strokeWidth={2.6} />
          </div>

          {/* "Recibido" y no "confirmado": en este instante nadie del negocio
              lo miró todavía. Y "Confirmado" es un estado real del pedido, el
              que el admin pone cuando verificó stock -- si la pantalla usa esa
              palabra acá, el cliente y el panel le dan dos significados
              distintos al mismo término, y el del cliente es el optimista. */}
          <div className="mb-2 font-body text-body-sm text-textMuted">
            Pedido recibido
          </div>
          <h1 className="mb-7 font-display text-display-lg font-medium text-ink900">
            N.º {String(order.id).padStart(5, "0")}
          </h1>

          <div className="mb-8 flex flex-col gap-4 border-y border-border py-6 text-left">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <span className="mt-0.5 font-body text-[14px] font-medium tabular-nums text-primary">{i + 1}.</span>
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
        <div className="mb-10">
          <p className="m-0 mb-3 font-body text-body-sm text-textMuted">Último paso</p>
          <h1 className="m-0 font-display text-display-md font-medium text-ink900 md:text-display-lg">
            Confirmar pedido
          </h1>
          <p className="mt-4 max-w-[440px] font-body text-body text-textMuted">
            Revisá los ítems y elegí cómo querés pagar. Nada se cobra en este paso.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px] lg:items-start lg:gap-9">
          {/* ── Columna izquierda: revisión + pago + notas ── */}
          <div className="flex flex-col gap-8">
            <div>
              <StepHeading step={1}>Tu pedido</StepHeading>
              <div className="rounded-lg border border-border bg-white px-5 sm:px-7">
                {items.map((item) => (
                  <ReviewRow key={item.productId} item={item} />
                ))}
              </div>
            </div>

            <div>
              <StepHeading step={2}>Método de pago</StepHeading>
              <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            <div>
              <StepHeading step={3}>Notas</StepHeading>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Ej: preferencia de horario de entrega, aclaraciones del vehículo, etc."
                className="box-border w-full rounded-lg bg-white text-[15px]"
              />
              <p className="mt-2 font-body text-[12.5px] text-textFaint">
                Opcional. Lo lee la persona que prepara tu pedido.
              </p>
            </div>

            {error && (
              // Caja propia en vez de una barra al margen: un error que aparece
              // recién al apretar Confirmar tiene que verse desde el panel de la
              // derecha, que es donde estaba mirando la persona.
              <div className="flex items-start gap-3 rounded-xl bg-dangerSoft px-4 py-3.5 shadow-[0_0_0_1px_rgba(220,38,38,.18)]">
                <Icon name="alert" size={16} className="mt-px shrink-0 text-danger" />
                <p className="m-0 font-body text-[14px] leading-snug text-ink900">{error}</p>
              </div>
            )}

            <Link
              to="/carrito"
              className="group inline-flex w-fit items-center gap-1.5 font-body text-[13.5px] font-semibold text-textFaint no-underline transition-colors hover:text-ink900"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
              Volver al carrito
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
