import type { ReactNode } from "react";
import { color, font } from "@/shared/config/theme";

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
    <div style={{ textAlign: align, maxWidth: align === "center" ? 640 : undefined, marginInline: align === "center" ? "auto" : undefined }}>
      {eyebrow && (
        <div style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600, letterSpacing: ".18em", color: color.primary, marginBottom: 14 }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{ fontFamily: font.display, fontSize: 36, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.02em", color: dark ? "#fff" : color.ink900 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontFamily: font.body, fontSize: 16, lineHeight: 1.6, color: dark ? color.textOnDarkFaint : color.textMuted, marginTop: 14 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
