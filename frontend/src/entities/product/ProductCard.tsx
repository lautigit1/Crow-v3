import { memo } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Badge, Icon, ProductImage } from "@/shared/ui";
import { formatPrice } from "@/shared/lib/format";
import { useFavorites } from "@/shared/lib/useFavorites";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import type { Product } from ".";

function WaIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.119 1.532 5.845L.057 23.428a.5.5 0 0 0 .609.61l5.652-1.48A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 0 1-5.003-1.373l-.36-.213-3.716.972.992-3.629-.235-.374A9.793 9.793 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
    </svg>
  );
}

/**
 * `hovered`/`waHov` React state + onMouseEnter/Leave used to drive purely
 * static color/shadow/transform swaps (plus one direct
 * `currentTarget.style.background =` mutation on the "Cotizar" button, the
 * same antipattern already flagged elsewhere). Since every value toggled was
 * static, this now uses native `hover:`/`group-hover:` CSS instead -- same
 * visual result, no re-render on hover, no DOM mutation.
 */
// React.memo -- hallazgo de "necesidad media" de la auditoría técnica del
// 2026-07-13: el catálogo renderiza hasta 48 de estas cards por página, y
// sin memo cada una se re-renderiza en cada render de CatalogPage (ej. al
// tipear en el buscador antes del debounce, o al abrir el drawer de
// filtros), no solo cuando cambian sus propios props. Para que el memo
// evite renders de verdad (no solo lo parezca), `onQuote` tiene que llegar
// con la misma referencia entre renders -- los call sites (CatalogPage,
// FavoritesPage) usan useCallback para eso.
export const ProductCard = memo(function ProductCard({ product, onQuote }: { product: Product; onQuote: (p: Product) => void }) {
  const inStock = product.stock > 0;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const waLink = useWaLink();

  const waMsg = `Hola Crow! Me interesa este producto: ${product.name} (SKU: ${product.sku}). ¿Tienen disponibilidad?`;
  const detailUrl = `/producto/${product.id}`;

  return (
    <div className="group bg-white border border-border hover:border-primary rounded-lg flex flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-[180ms] shadow-sm hover:shadow-md hover:-translate-y-[3px]">
      {/* Image */}
      <div className="relative">
        <Link to={detailUrl} className="block">
          <ProductImage
            name={product.name}
            sku={product.sku}
            category={product.category?.name}
            imageUrl={product.image_url}
            ratio={1.5}
          />
        </Link>

        {/* Stock badge */}
        <span className="absolute top-2.5 right-2.5 flex items-center gap-[5px]">
          {inStock && product.stock <= 2 && (
            <span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0 animate-[stockPulse_1.4s_ease-in-out_infinite]" />
          )}
          <Badge tone={!inStock ? "danger" : product.stock <= 2 ? "danger" : "success"}>
            {!inStock ? "Sin stock" : product.stock <= 2 ? `Últimas ${product.stock}` : "En stock"}
          </Badge>
        </span>

        {/* Favorite */}
        <button
          type="button"
          aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
          onClick={(e) => { e.preventDefault(); toggle(product.id); }}
          className={clsx(
            "absolute top-2.5 left-2.5 w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center transition-all duration-150 border",
            fav ? "border-primary bg-primarySoft text-primary" : "border-border bg-[rgba(255,255,255,.92)] text-textFaint"
          )}
        >
          <Icon name="star" size={14} />
        </button>
      </div>

      {/* Content */}
      <Link to={detailUrl} className="pt-3.5 px-3.5 pb-0 flex-1 flex flex-col no-underline text-inherit">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-2">
          {product.category?.name && (
            <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase text-primary bg-primarySoft py-0.5 px-[7px] rounded-[3px]">
              {product.category.name}
            </span>
          )}
          <span className="font-mono text-[10px] text-textFaint">{product.sku}</span>
        </div>

        {/* Name */}
        <h3 className="font-display text-[15px] font-bold leading-[1.3] text-ink900 mb-1.5 flex-1">
          {product.name}
        </h3>

        {/* Brand */}
        {product.brand?.name && (
          <div className="font-body text-[12px] text-textFaint mb-2.5">{product.brand.name}</div>
        )}

        {/* Price */}
        <div className="font-display text-[20px] font-black tracking-[-0.02em] text-primary mb-3">
          {formatPrice(product.price)}
        </div>
      </Link>

      {/* Actions */}
      <div className="flex border-t border-border">
        {/* Cotizar */}
        <button
          onClick={() => onQuote(product)}
          className="flex-1 py-[11px] font-body text-[13px] font-semibold text-textMuted group-hover:text-primary bg-transparent border-none cursor-pointer flex items-center justify-center gap-1.5 transition-[color,background-color] duration-150 rounded-bl-lg hover:bg-primarySoft"
        >
          <Icon name="message" size={13} />
          Cotizar
        </button>

        {/* Divider */}
        <div className="w-px bg-border shrink-0" />

        {/* WhatsApp */}
        <a
          href={waLink(waMsg)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-[11px] font-body text-[13px] font-semibold text-[#16A34A] bg-transparent no-underline flex items-center justify-center gap-1.5 transition-[color,background-color] duration-150 rounded-br-lg hover:text-white hover:bg-[#16A34A]"
        >
          <WaIcon />
          Consultar
        </a>
      </div>
    </div>
  );
});
