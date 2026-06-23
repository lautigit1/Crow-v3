import { useState } from "react";
import { Badge, Icon, ProductImage } from "@/shared/ui";
import { formatPrice } from "@/shared/lib/format";
import { useFavorites } from "@/shared/lib/useFavorites";
import { waLink } from "@/shared/config/contact";
import { color, font, radius, shadow } from "@/shared/config/theme";
import type { Product } from ".";

function WaIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.119 1.532 5.845L.057 23.428a.5.5 0 0 0 .609.61l5.652-1.48A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 0 1-5.003-1.373l-.36-.213-3.716.972.992-3.629-.235-.374A9.793 9.793 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
    </svg>
  );
}

export function ProductCard({ product, onQuote }: { product: Product; onQuote: (p: Product) => void }) {
  const inStock = product.stock > 0;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const [hovered, setHovered] = useState(false);
  const [waHov, setWaHov] = useState(false);

  const waMsg = `Hola Crow! Me interesa este producto: ${product.name} (SKU: ${product.sku}). ¿Tienen disponibilidad?`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? color.primary : color.border}`,
        borderRadius: radius.lg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "border-color .18s, box-shadow .18s, transform .18s",
        boxShadow: hovered ? shadow.md : shadow.sm,
        transform: hovered ? "translateY(-3px)" : "none",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative" }}>
        <ProductImage
          name={product.name}
          sku={product.sku}
          category={product.category?.name}
          imageUrl={product.image_url}
          ratio={1.5}
        />

        {/* Stock badge */}
        <span style={{ position: "absolute", top: 10, right: 10 }}>
          <Badge tone={inStock ? "success" : "warning"}>
            {inStock ? "En stock" : "Bajo pedido"}
          </Badge>
        </span>

        {/* Favorite */}
        <button
          type="button"
          aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
          onClick={(e) => { e.preventDefault(); toggle(product.id); }}
          style={{
            position: "absolute", top: 10, left: 10,
            width: 30, height: 30, borderRadius: "50%",
            border: `1px solid ${fav ? color.primary : color.border}`,
            background: fav ? color.primarySoft : "rgba(255,255,255,.92)",
            cursor: "pointer",
            color: fav ? color.primary : color.textFaint,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
          }}
        >
          <Icon name="star" size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 14px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {product.category?.name && (
            <span style={{
              fontFamily: font.mono, fontSize: 10, fontWeight: 700,
              letterSpacing: ".06em", textTransform: "uppercase",
              color: color.primary, background: color.primarySoft,
              padding: "2px 7px", borderRadius: 3,
            }}>
              {product.category.name}
            </span>
          )}
          <span style={{ fontFamily: font.mono, fontSize: 10, color: color.textFaint }}>
            {product.sku}
          </span>
        </div>

        {/* Name */}
        <h3 style={{
          fontFamily: font.display, fontSize: 15, fontWeight: 700,
          lineHeight: 1.3, color: color.ink900,
          marginBottom: 6, flex: 1,
        }}>
          {product.name}
        </h3>

        {/* Brand */}
        {product.brand?.name && (
          <div style={{
            fontFamily: font.body, fontSize: 12, color: color.textFaint, marginBottom: 10,
          }}>
            {product.brand.name}
          </div>
        )}

        {/* Price */}
        <div style={{
          fontFamily: font.display, fontSize: 20, fontWeight: 900,
          letterSpacing: "-.02em",
          color: color.primary, marginBottom: 12,
        }}>
          {formatPrice(product.price)}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: "flex",
        borderTop: `1px solid ${color.border}`,
      }}>
        {/* Cotizar */}
        <button
          onClick={() => onQuote(product)}
          style={{
            flex: 1, padding: "11px 0",
            fontFamily: font.body, fontSize: 13, fontWeight: 600,
            color: hovered ? color.primary : color.textMuted,
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "color .15s, background .15s",
            borderRadius: `0 0 0 ${radius.lg}`,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = color.primarySoft; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <Icon name="message" size={13} />
          Cotizar
        </button>

        {/* Divider */}
        <div style={{ width: 1, background: color.border, flexShrink: 0 }} />

        {/* WhatsApp */}
        <a
          href={waLink(waMsg)}
          target="_blank"
          rel="noreferrer"
          onMouseEnter={() => setWaHov(true)}
          onMouseLeave={() => setWaHov(false)}
          style={{
            flex: 1, padding: "11px 0",
            fontFamily: font.body, fontSize: 13, fontWeight: 600,
            color: waHov ? "#fff" : "#16A34A",
            background: waHov ? "#16A34A" : "transparent",
            textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "color .15s, background .15s",
            borderRadius: `0 0 ${radius.lg} 0`,
          }}
        >
          <WaIcon />
          Consultar
        </a>
      </div>
    </div>
  );
}
