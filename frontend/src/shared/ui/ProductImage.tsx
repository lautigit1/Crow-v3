import { Icon, type IconName } from "./Icon";

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
   * baja el ícono, saca la grilla de textura y el label de SKU.
   */
  compact?: boolean;
}) {
  if (imageUrl) {
    return (
      <div className="relative overflow-hidden" style={{ aspectRatio: String(ratio), borderRadius: radius }}>
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
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
    return (
      <img src={logoUrl} alt={name} className="max-w-[70%] object-contain" style={{ maxHeight: size }} />
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
