import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import { cloudinaryTransform } from "@/shared/lib/cloudinaryUrl";

const CATEGORY_ICON: Record<string, IconName> = {
  Autos: "wrench",
  Camiones: "truck",
  Motos: "settings",
  Lubricantes: "box",
  Baterías: "trendingUp",
  Filtros: "inventory",
  Detailing: "star",
  Accesorios: "products",
};

/** Deterministic hue from a string so each product gets a stable colour. */
function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * Real visual for a product: shows the uploaded image when present, otherwise a
 * branded gradient tile with the category icon and SKU — no "[ FOTO ]" mock.
 *
 * `ratio`, `radius`, and every hue-derived gradient/color below are runtime
 * values (per-product aspect ratio, per-instance radius override, a color
 * hashed from the SKU/name) -- Tailwind can't turn those into static classes,
 * so they stay as inline style. Everything with a fixed value (positioning,
 * the grid texture, the SKU label) moved to Tailwind classes.
 */
export function ProductImage({
  name,
  sku,
  category,
  imageUrl,
  ratio = 1.4,
  radius = 0,
  compact = false,
  priority = false,
}: {
  name: string;
  sku?: string;
  category?: string | null;
  imageUrl?: string | null;
  ratio?: number;
  radius?: number;
  /**
   * El tile de reemplazo (ícono + label de SKU) está pensado para tiles
   * grandes (cards de catálogo, imagen de detalle, ~90px+). En miniaturas
   * chicas (carrito, checkout, filas de tabla) el ícono de 44px y el
   * label de SKU absoluto se pisan y se ven amontonados/rotos. `compact`
   * baja el ícono, saca la grilla de textura y el label de SKU. También se
   * usa para elegir el ancho pedido a Cloudinary (miniatura vs. tile
   * grande) -- ver `cloudinaryTransform`.
   */
  compact?: boolean;
  /**
   * `false` (default) -- la imagen carga lazy (`loading="lazy"`), correcto
   * para catálogo/carrito/checkout/admin, donde nunca es la primera cosa
   * que el browser tiene que pintar. `true` -- carga eager + prioridad alta,
   * para la imagen principal de ProductDetailPage, que sí suele ser el
   * elemento más grande del viewport inicial (candidato a LCP) -- lazy-
   * loadearla ahí sería contraproducente.
   */
  priority?: boolean;
}) {
  // Una URL guardada puede dejar de responder: la imagen se borró de
  // Cloudinary, se cargó mal a mano, o el producto vino de una importación con
  // un link roto. Sin esto el navegador pinta el ícono de imagen rota más el
  // texto alternativo -- lo más barato que puede verse en una pantalla de
  // compra. Al fallar se cae al tile generado, que ya existe para los
  // productos sin foto y se ve deliberado en vez de accidental.
  const [fallo, setFallo] = useState(false);

  if (imageUrl && !fallo) {
    // Miniaturas (compact) piden un ancho chico a Cloudinary -- de sobra
    // para el tile más grande en ese modo (80px, carrito) incluso en
    // pantallas retina. Tiles grandes (catálogo, detalle) piden más
    // resolución -- el contenedor más ancho en ese modo es ~440px
    // (ProductDetailPage), así que 900 cubre retina 2x con margen.
    const src = cloudinaryTransform(imageUrl, { width: compact ? 240 : 900 });
    return (
      <div className="relative overflow-hidden" style={{ aspectRatio: String(ratio), borderRadius: radius }}>
        <img
          src={src}
          alt={name}
          onError={() => setFallo(true)}
          className="w-full h-full object-cover"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
      </div>
    );
  }

  const hue = hueOf(sku || name);
  const icon = (category && CATEGORY_ICON[category]) || "box";

  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{
        aspectRatio: String(ratio),
        borderRadius: radius,
        background: `linear-gradient(135deg, hsl(${hue} 70% 96%), hsl(${(hue + 40) % 360} 65% 92%))`,
      }}
    >
      {/* subtle grid texture -- solo en tiles grandes, en chicos se ve como ruido */}
      {!compact && (
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(13,23,40,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,23,40,.04)_1px,transparent_1px)] [background-size:22px_22px]" />
      )}
      <span className="relative opacity-90" style={{ color: `hsl(${hue} 55% 42%)` }}>
        <Icon name={icon} size={compact ? 20 : 44} strokeWidth={compact ? 1.6 : 1.4} />
      </span>
      {sku && !compact && (
        <span className="absolute left-3 bottom-2.5 font-mono text-[10px] font-semibold text-textFaint tracking-[0.04em]">
          {sku}
        </span>
      )}
    </div>
  );
}

/** Brand monogram tile (replaces "[ LOGO MARCA ]"). */
export function BrandMark({ name, logoUrl, size = 56 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    // `size` ya es el ancho máximo real en px -- se le pide justo eso (×2
    // para pantallas retina) a Cloudinary en vez de un valor fijo genérico.
    const src = cloudinaryTransform(logoUrl, { width: size * 2 });
    return (
      <img src={src} alt={name} className="max-w-[70%] object-contain" style={{ maxHeight: size }} loading="lazy" decoding="async" />
    );
  }
  const hue = hueOf(name);
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div
      className="rounded-lg flex items-center justify-center font-display font-extrabold tracking-[0.02em]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 60% 95%), hsl(${(hue + 30) % 360} 55% 90%))`,
        color: `hsl(${hue} 50% 38%)`,
        fontSize: size * 0.34,
      }}
    >
      {initials || "—"}
    </div>
  );
}
