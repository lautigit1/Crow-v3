import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useFavorites } from "@/shared/lib/useFavorites";
import { useCart } from "@/app/providers/CartProvider";
import { formatPrice } from "@/shared/lib/format";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import { Container, Badge, Button, Icon, ProductImage, CenteredSpinner, EmptyState } from "@/shared/ui";
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
          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] tracking-[.05em] text-textFaint mb-5 md:mb-8">
            <Link to="/" className="text-inherit no-underline">INICIO</Link>
            <span>/</span>
            <Link to="/catalogo" className="text-inherit no-underline">CATÁLOGO</Link>
            <span>/</span>
            <span className="text-primary">{product.sku}</span>
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
            </div>

            {/* ── Info ── */}
            <div>
              {/* Meta row */}
              <div className="flex items-center gap-2 mb-3.5">
                {product.category?.name && (
                  <span className="font-mono text-[11px] font-bold tracking-[.06em] uppercase text-primary bg-primarySoft py-[3px] px-[9px] rounded-[3px]">
                    {product.category.name}
                  </span>
                )}
                <span className="font-mono text-xs text-textFaint">
                  {product.sku}
                </span>
              </div>

              {/* Nombre */}
              <h1 className="font-display font-black text-[26px] md:text-[34px] leading-[1.15] tracking-[-.02em] text-ink900 m-0 mb-2.5">
                {product.name}
              </h1>

              {/* Marca */}
              {product.brand?.name && (
                <div className="font-body text-[14.5px] text-textMuted mb-[22px]">
                  {product.brand.name}
                </div>
              )}

              {/* Precio */}
              <div className="font-display font-black text-[28px] md:text-[34px] tracking-[-.02em] text-primary mb-4">
                {formatPrice(product.price)}
              </div>

              {/* Badges: stock + vehículo */}
              <div className="flex flex-wrap gap-2 mb-7">
                <Badge tone={!inStock ? "danger" : product.stock <= 2 ? "danger" : "success"}>
                  {!inStock ? "Sin stock" : product.stock <= 2 ? `Últimas ${product.stock} unidades` : "En stock"}
                </Badge>
                {product.vehicle_type && product.vehicle_type !== "Universal" && (
                  <Badge tone="neutral">{product.vehicle_type}</Badge>
                )}
              </div>

              {/* Descripción */}
              {product.description && (
                <p className="font-body text-[14.5px] leading-[1.7] text-textMuted m-0 mb-8 max-w-[560px]">
                  {product.description}
                </p>
              )}

              {/* Compra directa */}
              {inStock ? (
                <div className="flex flex-wrap items-center gap-3 mb-3.5">
                  <QuantityStepper value={qty} max={maxQty} onChange={setQty} />
                  <Button onClick={handleBuyNow}>Comprar ahora</Button>
                  <Button variant="outline" onClick={handleAddToCart}>
                    <Icon name="cart" size={15} /> {added ? "¡Agregado!" : "Agregar al carrito"}
                  </Button>
                </div>
              ) : (
                <div className="mb-3.5">
                  <Button disabled>Sin stock disponible</Button>
                  <p className="font-body text-[12.5px] text-textFaint m-0 mt-2">
                    Consultanos por WhatsApp para saber cuándo vuelve a estar disponible.
                  </p>
                </div>
              )}

              {/* Acciones secundarias */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setQuoteOpen(true)}>
                  <Icon name="message" size={15} /> Cotizar
                </Button>
                <Button as="a" href={waLink(waMsg)} target="_blank" rel="noreferrer" variant="whatsapp">
                  Consultar por WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} initialMessage={waMsg} productId={product.id} />
    </>
  );
}
