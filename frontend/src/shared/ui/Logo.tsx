import { Link } from "react-router-dom";
import clsx from "clsx";

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
  const onDark = variant === "dark";

  return (
    <Link to="/" aria-label="Crow Repuestos" className="inline-flex items-center gap-2.5 no-underline">
      {/* Crow head mark */}
      <img
        src="/crow-logo.png"
        alt="Crow"
        width={imgSize}
        height={imgSize}
        className="block rounded-[7px] object-cover shrink-0"
      />

      {/* Wordmark */}
      <span className="flex flex-col leading-none">
        <span
          className={clsx(
            "font-display font-black tracking-[0.04em]",
            size === "sm" ? "text-[18px]" : "text-[20px]",
            onDark ? "text-white" : "text-ink900"
          )}
        >
          CROW
        </span>
        <span
          className={clsx(
            "font-mono font-medium tracking-[0.4em] text-primary mt-[3px]",
            size === "sm" ? "text-[8.5px]" : "text-[9px]"
          )}
        >
          REPUESTOS
        </span>
      </span>
    </Link>
  );
}
