import { Icon, type IconName } from "@/shared/ui";
import { color, font, radius } from "@/shared/config/theme";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, { fg: string; bg: string; accent: string; glow: string }> = {
  primary: { fg: color.primary,  bg: color.primarySoft, accent: color.primary,  glow: "rgba(0,87,217,.08)" },
  success: { fg: "#15803D",      bg: "#DCFCE7",         accent: "#16A34A",      glow: "rgba(22,163,74,.08)" },
  warning: { fg: "#B45309",      bg: "#FEF3C7",         accent: "#D97706",      glow: "rgba(217,119,6,.08)" },
  danger:  { fg: "#DC2626",      bg: "#FEE2E2",         accent: "#DC2626",      glow: "rgba(220,38,38,.08)" },
  neutral: { fg: color.ink700,   bg: "#F1F5F9",         accent: color.ink700,   glow: "transparent" },
};

export function StatCard({
  icon, label, value, tone = "neutral", hint, delta,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
  delta?: { value: number; label?: string };
}) {
  const t = tones[tone];

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${color.border}`,
      borderRadius: radius.lg,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      boxShadow: "0 1px 3px rgba(13,23,40,.05)",
      transition: "box-shadow .2s",
    }}>
      {/* Top accent */}
      <div style={{ height: 3, background: t.accent, opacity: tone === "neutral" ? 0.2 : 0.9 }} />

      <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Row: label + icon */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontFamily: font.mono, fontSize: 10.5, fontWeight: 700,
            letterSpacing: ".1em", color: color.textFaint,
            textTransform: "uppercase", lineHeight: 1.3,
          }}>
            {label}
          </span>
          <span style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: t.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.fg,
            boxShadow: `0 0 0 4px ${t.glow}`,
          }}>
            <Icon name={icon} size={17} />
          </span>
        </div>

        {/* Value */}
        <div style={{
          fontFamily: font.display, fontSize: 32, fontWeight: 900,
          color: color.ink900, lineHeight: 1, letterSpacing: "-.02em",
        }}>
          {value}
        </div>

        {/* Delta + hint */}
        {(delta || hint) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {delta && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontFamily: font.mono, fontSize: 11, fontWeight: 700,
                color: delta.value >= 0 ? "#15803D" : "#DC2626",
                background: delta.value >= 0 ? "#DCFCE7" : "#FEE2E2",
                padding: "2px 7px", borderRadius: 4,
              }}>
                {delta.value >= 0 ? "↑" : "↓"} {Math.abs(delta.value)}%
              </span>
            )}
            {hint && (
              <span style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint }}>
                {delta ? hint : hint}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
