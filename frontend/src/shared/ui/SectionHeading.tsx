import type { ReactNode } from "react";
import clsx from "clsx";

/** Eyebrow + title block used to open most landing sections. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  dark,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  dark?: boolean;
  align?: "left" | "center";
}) {
  return (
    <div className={clsx(align === "center" ? "text-center max-w-[640px] mx-auto" : "text-left")}>
      {eyebrow && (
        <div className="font-mono text-[12px] font-semibold tracking-[0.18em] text-primary mb-3.5">{eyebrow}</div>
      )}
      <h2
        className={clsx(
          "font-display text-[36px] font-extrabold leading-[1.08] tracking-[-0.02em]",
          dark ? "text-white" : "text-ink900"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={clsx(
            "font-body text-[16px] leading-[1.6] mt-3.5",
            dark ? "text-textOnDarkFaint" : "text-textMuted"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
