import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { useFavorites } from "@/shared/lib/useFavorites";
import { useCart } from "@/app/providers/CartProvider";
import { formatPrice } from "@/shared/lib/format";
import { waLink } from "@/shared/config/contact";
import { Container, Badge, Button, Icon, ProductImage, CenteredSpinner, EmptyState } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { productApi, type Product } from "@/entities/product";
import { color, font, radius, shadow } from "@/shared/config/theme";

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const btnStyle: CSSProperties = {
    width: 34, height: 34, border: "none", background: "none",
    color: color.ink700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: font.body, fontSize: 16, fontWeight: 700,
  };
  return (
    <div style={{
      display: "flex", alignItems: "center",
      border: `1px solid ${color.border}`, borderRadius: radius.md, overflow: "hidden",
    }}>
      <button type="button" style={btnStyle} disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </button>
      <span style={{ width: 36, textAlign: "center", fontFamily: font.body, fontSize: 14, fontWeight: 700, color: color.ink900 }}>
        {value}
      </span>
      <button type="button" style={btnStyle} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isMobile } = useBreakpoint();
  const { isFavorite, toggle } = useFavorites();
  const { addItem } = useCart();
  const navigate = useNavigate();

  // undefined = cargando · null = no encontrado · Product = ok
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id || !/^\d+$/.test(id)) {
      setProduct(null);
      return;
    }
    setProduct(undefined);
    productApi.get(Number(id)).then(setProduct).catch(() => setProduct(null));
  }, [id]);

  usePageMeta(
    product ? product.name : "Producto",
    product?.description ?? "Detalle del producto en Crow Repuestos.",
  );

  if (product === undefined) {
    return (
      <Container style={{ padding: "120px 16px" }}>
        <CenteredSpinner />
      </Container>
    );
  }

  if (product === null) {
    return (
      <Container style={{ padding: "80px 16px" }}>
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
      <section style={{ background: "#fff", minHeight: "70vh" }}>
        <Container style={{ padding: isMobile ? "20px 16px 60px" : "32px 40px 96px" }}>
          {/* Breadcrumb minimalista */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            fontFamily: font.mono, fontSize: 11, letterSpacing: ".05em",
            color: color.textFaint, marginBottom: isMobile ? 20 : 32,
          }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>INICIO</Link>
            <span>/</span>
            <Link to="/catalogo" style={{ color: "inherit", textDecoration: "none" }}>CATÁLOGO</Link>
            <span>/</span>
            <span style={{ color: color.primary }}>{product.sku}</span>
          </div>

          <div style={{
            display: isMobile ? "block" : "grid",
            gridTemplateColumns: "minmax(0,440px) 1fr",
            gap: isMobile ? 24 : 56,
            alignItems: "start",
          }}>
            {/* ── Imagen ── */}
            <div style={{ position: "relative", marginBottom: isMobile ? 24 : 0 }}>
              <div style={{
                borderRadius: radius.lg, overflow: "hidden",
                border: `1px solid ${color.border}`, boxShadow: shadow.sm,
              }}>
                <ProductImage
                  name={product.name}
                  sku={product.sku}
                  category={product.category?.name}
                  imageUrl={product.image_url}
                  ratio={1}
                  radius={0}
                />
              </div>
              <button
                type="button"
                aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
                onClick={() => toggle(product.id)}
                style={{
                  position: "absolute", top: 14, left: 14,
                  width: 36, height: 36, borderRadius: "50%",
                  border: `1px solid ${fav ? color.primary : color.border}`,
                  background: fav ? color.primarySoft : "rgba(255,255,255,.92)",
                  cursor: "pointer",
                  color: fav ? color.primary : color.textFaint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}
              >
                <Icon name="star" size={17} />
              </button>
            </div>

            {/* ── Info ── */}
            <div>
              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                {product.category?.name && (
                  <span style={{
                    fontFamily: font.mono, fontSize: 11, fontWeight: 700,
                    letterSpacing: ".06em", textTransform: "uppercase",
                    color: color.primary, background: color.primarySoft,
                    padding: "3px 9px", borderRadius: 3,
                  }}>
                    {product.category.name}
                  </span>
                )}
                <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint }}>
                  {product.sku}
                </span>
              </div>

              {/* Nombre */}
              <h1 style={{
                fontFamily: font.display, fontWeight: 900,
                fontSize: isMobile ? 26 : 34, lineHeight: 1.15,
                letterSpacing: "-.02em", color: color.ink900,
                margin: "0 0 10px",
              }}>
                {product.name}
              </h1>

              {/* Marca */}
              {product.brand?.name && (
                <div style={{ fontFamily: font.body, fontSize: 14.5, color: color.textMuted, marginBottom: 22 }}>
                  {product.brand.name}
                </div>
              )}

              {/* Precio */}
              <div style={{
                fontFamily: font.display, fontWeight: 900,
                fontSize: isMobile ? 28 : 34, letterSpacing: "-.02em",
                color: color.primary, marginBottom: 16,
              }}>
                {formatPrice(product.price)}
              </div>

              {/* Badges: stock + vehículo */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                <Badge tone={!inStock ? "danger" : product.stock <= 2 ? "danger" : "success"}>
                  {!inStock ? "Sin stock" : product.stock <= 2 ? `Últimas ${product.stock} unidades` : "En stock"}
                </Badge>
                {product.vehicle_type && product.vehicle_type !== "Universal" && (
                  <Badge tone="neutral">{product.vehicle_type}</Badge>
                )}
              </div>

              {/* Descripción */}
              {product.description && (
                <p style={{
                  fontFamily: font.body, fontSize: 14.5, lineHeight: 1.7,
                  color: color.textMuted, margin: "0 0 32px", maxWidth: 560,
                }}>
                  {product.description}
                </p>
              )}

              {/* Compra directa */}
              {inStock ? (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <QuantityStepper value={qty} max={maxQty} onChange={setQty} />
                  <Button onClick={handleBuyNow}>Comprar ahora</Button>
                  <Button variant="outline" onClick={handleAddToCart}>
                    <Icon name="cart" size={15} /> {added ? "¡Agregado!" : "Agregar al carrito"}
                  </Button>
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <Button disabled>Sin stock disponible</Button>
                  <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.textFaint, margin: "8px 0 0" }}>
                    Consultanos por WhatsApp para saber cuándo vuelve a estar disponible.
                  </p>
                </div>
              )}

              {/* Acciones secundarias */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
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
