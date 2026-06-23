import { Icon, type IconName } from "./Icon";
import { color, font } from "@/shared/config/theme";

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
 */
export function ProductImage({
  name,
  sku,
  category,
  imageUrl,
  ratio = 1.4,
  radius = 0,
}: {
  name: string;
  sku?: string;
  category?: string | null;
  imageUrl?: string | null;
  ratio?: number;
  radius?: number;
}) {
  if (imageUrl) {
    return (
      <div style={{ position: "relative", aspectRatio: String(ratio), overflow: "hidden", borderRadius: radius }}>
        <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  const hue = hueOf(sku || name);
  const icon = (category && CATEGORY_ICON[category]) || "box";

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: String(ratio),
        borderRadius: radius,
        overflow: "hidden",
        background: `linear-gradient(135deg, hsl(${hue} 70% 96%), hsl(${(hue + 40) % 360} 65% 92%))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* subtle grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(13,23,40,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(13,23,40,.04) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <span style={{ position: "relative", color: `hsl(${hue} 55% 42%)`, opacity: 0.9 }}>
        <Icon name={icon} size={44} strokeWidth={1.4} />
      </span>
      {sku && (
        <span
          style={{
            position: "absolute",
            left: 12,
            bottom: 10,
            fontFamily: font.mono,
            fontSize: 10,
            fontWeight: 600,
            color: color.textFaint,
            letterSpacing: ".04em",
          }}
        >
          {sku}
        </span>
      )}
    </div>
  );
}

/** Brand monogram tile (replaces "[ LOGO MARCA ]"). */
export function BrandMark({ name, logoUrl, size = 56 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) return <img src={logoUrl} alt={name} style={{ maxHeight: size, maxWidth: "70%", objectFit: "contain" }} />;
  const hue = hueOf(name);
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, hsl(${hue} 60% 95%), hsl(${(hue + 30) % 360} 55% 90%))`,
        color: `hsl(${hue} 50% 38%)`,
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: size * 0.34,
        letterSpacing: ".02em",
      }}
    >
      {initials || "—"}
    </div>
  );
}
