import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useFavorites } from "@/shared/lib/useFavorites";
import { useCart } from "@/app/providers/CartProvider";
import { formatPrice } from "@/shared/lib/format";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import { Container, Button, Icon, ProductImage, CenteredSpinner, EmptyState } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { useProductQuery } from "@/entities/product/queries";

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const btnClass = "w-[34px] h-[34px] border-none bg-none text-ink700 cursor-pointer flex items-center justify-center font-body text-base font-bold";
  return (
    <div className="flex items-center border border-border rounded-md overflow-hidden">
      <button type="button" className={btnClass} disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </button>
      <span className="w-9 text-center font-body text-sm font-bold text-ink900">
        {value}
      </span>
      <button type="button" className={btnClass} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isFavorite, toggle } = useFavorites();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const waLink = useWaLink();

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const validId = id && /^\d+$/.test(id) ? Number(id) : undefined;
  const { data: product, isPending, isError } = useProductQuery(validId);
  const notFound = validId === undefined || isError;

  usePageMeta(
    product ? product.name : "Producto",
    product?.description ?? "Detalle del producto en Crow Repuestos.",
  );

  if (isPending && !notFound) {
    return (
      <Container className="py-[120px] px-4">
        <CenteredSpinner />
      </Container>
    );
  }

  if (notFound || !product) {
    return (
      <Container className="py-20 px-4">
        <EmptyState
          title="Producto no encontrado"
          message="Puede que ya no esté disponible o el link sea incorrecto."
          action={<Button as={Link} to="/catalogo">Volver al catálogo</Button>}
        />
      </Container>
    );
  }

  const inStock = product.stock > 0;
  const fav = isFavorite(product.id);
  const waMsg = `Hola Crow! Me interesa este producto: ${product.name} (SKU: ${product.sku}). ¿Tienen disponibilidad?`;
  const maxQty = product.stock;

  const handleAddToCart = () => {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    addItem(product, qty);
    navigate("/checkout");
  };

  return (
    <>
      <section className="bg-white min-h-[70vh]">
        <Container className="pt-5 pb-[60px] md:pt-8 md:pb-24">
          {/* Breadcrumb minimalista */}
          {/* Mismo criterio que el del catálogo: sentence case en DM Sans. El
              SKU es lo único que queda en mono acá, porque sí es un código. */}
          <div className="flex items-center gap-2 flex-wrap font-body text-[13px] text-textMuted mb-5 md:mb-8">
            <Link to="/" className="text-inherit no-underline hover:text-ink900 transition-colors duration-150">
              Inicio
            </Link>
            <span className="text-[#CBD5E1]">/</span>
            <Link to="/catalogo" className="text-inherit no-underline hover:text-ink900 transition-colors duration-150">
              Catálogo
            </Link>
            <span className="text-[#CBD5E1]">/</span>
            <span className="font-mono text-[12px] text-ink800">{product.sku}</span>
          </div>

          <div className="block md:grid gap-6 md:gap-14 items-start md:grid-cols-[minmax(0,440px)_1fr]">
            {/* ── Imagen ── */}
            <div className="relative mb-6 md:mb-0">
              <div className="rounded-lg overflow-hidden border border-border shadow-sm">
                <ProductImage
                  name={product.name}
                  sku={product.sku}
                  category={product.category?.name}
                  imageUrl={product.image_url}
                  ratio={1}
                  radius={0}
                  priority
                />
              </div>
              <button
                type="button"
                aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
                onClick={() => toggle(product.id)}
                className={clsx(
                  "absolute top-3.5 left-3.5 w-9 h-9 rounded-full cursor-pointer flex items-center justify-center border transition-all duration-150",
                  fav ? "border-primary bg-primarySoft text-primary" : "border-border bg-[rgba(255,255,255,.92)] text-textFaint",
                )}
              >
                <Icon name="star" size={17} />
              </button>

              {/* Ficha técnica. Va bajo la imagen y no en la columna derecha
                  por dos razones: equilibra el largo de las dos columnas -- la
                  izquierda terminaba en la foto y dejaba medio metro de blanco
                  -- y separa lo que se lee de lo que se hace.
                  `vehicle_type` existe en el modelo desde siempre y no se
                  mostraba en ninguna parte salvo un badge suelto. */}
              <dl className="mt-5 border border-border rounded-xl overflow-hidden">
                {/* Sin mono en ninguna fila, ni siquiera en el código: es una
                    tabla de lectura, no una consola. La mono acá metía
                    espacios raros entre letras y hacía que cada valor pesara
                    distinto que el resto de la página. Toda la ficha en la
                    misma familia y el peso separa etiqueta de valor. */}
                {(
                  [
                    ["Código", product.sku],
                    ["Marca", product.brand?.name],
                    ["Categoría", product.category?.name],
                    ["Aplicación", product.vehicle_type],
                  ] as [string, string | undefined][]
                )
                  .filter(([, valor]) => !!valor)
                  .map(([etiqueta, valor]) => (
                    <div
                      key={etiqueta}
                      className="flex items-baseline justify-between gap-4 py-3 px-4 border-b border-border last:border-b-0 odd:bg-[#FCFDFE]"
                    >
                      <dt className="font-body text-[13.5px] font-medium text-textMuted shrink-0">{etiqueta}</dt>
                      <dd className="font-body text-[14px] font-semibold text-ink900 m-0 text-right truncate">
                        {valor}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>

            {/* ── Info ── */}
            <div>
              {/* Marca · categoría a la izquierda, SKU a la derecha. Mismo
                  renglón que en la tarjeta del catálogo: quien viene de ahí
                  reconoce la misma información en el mismo lugar. El chip azul
                  se fue -- competía con el precio y con el botón principal por
                  el mismo color. */}
              <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] tracking-[.1em] uppercase text-textFaint mb-3 pb-3 border-b border-border">
                <span className="truncate">
                  {[product.brand?.name, product.category?.name].filter(Boolean).join(" · ")}
                </span>
                <span className="shrink-0 normal-case tracking-normal text-[#9FB0C4]">{product.sku}</span>
              </div>

              <h1 className="font-display font-black text-[26px] md:text-[32px] leading-[1.14] tracking-[-.025em] text-ink900 m-0 mb-4">
                {product.name}
              </h1>

              {/* La descripción sube: antes iba después del precio y los
                  badges, así que lo primero que se leía del producto era
                  cuánto sale. Y va en `ink800`, no en `textMuted`: era el
                  texto más largo de la pantalla y estaba en el gris más claro
                  que tiene la paleta. */}
              {product.description && (
                <p className="font-body text-[15px] leading-[1.7] text-ink800 m-0 mb-7 max-w-[600px]">
                  {product.description}
                </p>
              )}

              {/* ── Panel de compra ──
                  Todo lo accionable adentro de una caja. Antes eran cinco
                  controles sueltos sobre el fondo blanco, en dos filas que
                  envolvían distinto según el ancho: no había forma de saber
                  cuál era el camino principal. */}
              <div className="border border-border rounded-xl bg-[#FCFDFE] p-5 max-w-[520px]">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    {product.price == null ? (
                      <div className="font-display text-[24px] font-bold text-textMuted">A consultar</div>
                    ) : (
                      <div className="whitespace-nowrap leading-none">
                        {/* El símbolo más chico y gris: el ojo tiene que caer
                            en la cifra. Y el número en tinta, no en el azul de
                            marca -- que acá es el color del botón de comprar y
                            no puede significar dos cosas distintas. */}
                        <span className="font-body text-[18px] font-semibold text-textFaint align-[3px]">$</span>
                        <span className="font-display text-[36px] md:text-[40px] font-black tracking-[-.045em] text-ink900">
                          {formatPrice(product.price).replace(/^\$\s?/, "")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className={clsx(
                      "inline-flex items-center gap-2 font-body text-[13.5px] font-semibold",
                      !inStock ? "text-textFaint" : product.stock <= 2 ? "text-warning" : "text-success",
                    )}
                  >
                    <span
                      className={clsx(
                        "w-2 h-2 rounded-full shrink-0",
                        !inStock ? "bg-borderStrong" : product.stock <= 2 ? "bg-warning" : "bg-success",
                      )}
                      aria-hidden="true"
                    />
                    {!inStock
                      ? "Sin stock"
                      : product.stock <= 2
                        ? `Últimas ${product.stock} unidades`
                        : `${product.stock} disponibles`}
                  </div>
                </div>

                {inStock ? (
                  <div className="mt-5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-3">
                      <span className="font-body text-[13px] font-semibold text-ink700">Cantidad</span>
                      <QuantityStepper value={qty} max={maxQty} onChange={setQty} />
                    </div>
                    {/* Grilla de dos columnas y no `flex-wrap`: con wrap, los
                        botones se reacomodaban distinto en cada ancho y la
                        jerarquía cambiaba sola. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Button onClick={handleBuyNow} fullWidth>Comprar ahora</Button>
                      <Button variant="outline" onClick={handleAddToCart} fullWidth>
                        <Icon name="cart" size={15} /> {added ? "¡Agregado!" : "Agregar al carrito"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <Button disabled fullWidth>Sin stock disponible</Button>
                    <p className="font-body text-[13px] text-textMuted m-0 mt-2.5">
                      Consultanos por WhatsApp para saber cuándo vuelve a estar disponible.
                    </p>
                  </div>
                )}

                {/* Separador antes de las acciones secundarias: son otra
                    intención -- preguntar, no comprar -- y sin la línea se
                    leían como dos botones más del mismo grupo. */}
                <div className="mt-5 pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button variant="outline" onClick={() => setQuoteOpen(true)} fullWidth>
                    <Icon name="message" size={15} /> Cotizar
                  </Button>
                  <Button as="a" href={waLink(waMsg)} target="_blank" rel="noreferrer" variant="whatsapp" fullWidth>
                    Consultar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} initialMessage={waMsg} productId={product.id} />
    </>
  );
}
