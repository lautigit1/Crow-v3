import type { ReactNode } from "react";
import { color, font, radius } from "@/shared/config/theme";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

const tones: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: color.surface, fg: color.textMuted, bd: color.border },
  primary: { bg: color.primarySoft, fg: color.primaryDark, bd: "#C7DBFB" },
  success: { bg: color.successSoft, fg: color.success, bd: "#BBF7D0" },
  warning: { bg: color.warningSoft, fg: color.warning, bd: "#FDE68A" },
  danger: { bg: color.dangerSoft, fg: color.danger, bd: "#FECACA" },
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        borderRadius: radius.pill,
        fontFamily: font.mono,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".03em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
