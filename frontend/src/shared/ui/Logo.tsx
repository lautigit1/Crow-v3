import { Link } from "react-router-dom";
import { font, color } from "@/shared/config/theme";

/**
 * Crow Repuestos logo — uses the official crow-head mark from /crow-logo.png.
 * Falls back to the text wordmark if the image fails to load.
 */
export function Logo({
  variant = "light",
  size = "md",
}: {
  variant?: "light" | "dark";
  size?: "sm" | "md";
}) {
  const imgSize = size === "sm" ? 32 : 38;
  const titleSize = size === "sm" ? 18 : 20;
  const subtitleSize = size === "sm" ? 8.5 : 9;
  const onDark = variant === "dark";

  return (
    <Link
      to="/"
      aria-label="Crow Repuestos"
      style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}
    >
      {/* Crow head mark */}
      <img
        src="/crow-logo.png"
        alt="Crow"
        width={imgSize}
        height={imgSize}
        style={{
          display: "block",
          borderRadius: 7,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />

      {/* Wordmark */}
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: font.display,
            fontWeight: 900,
            fontSize: titleSize,
            letterSpacing: ".04em",
            color: onDark ? "#fff" : color.ink900,
          }}
        >
          CROW
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontWeight: 500,
            fontSize: subtitleSize,
            letterSpacing: ".4em",
            color: color.primary,
            marginTop: 3,
          }}
        >
          REPUESTOS
        </span>
      </span>
    </Link>
  );
}
