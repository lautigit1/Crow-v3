import clsx from "clsx";
import { Icon, type IconName } from "@/shared/ui";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

// Tone is a fixed 5-item union, so each variant's colors are precomputed as
// static Tailwind classes instead of hex strings. Some tones reuse design
// tokens (primary/primarySoft/primaryDark, ink700); others (the accent bar
// greens/ambers, the icon-chip backgrounds) are one-off values from the
// original inline styles that aren't part of the token set, kept as
// arbitrary values.
const tones: Record<Tone, { iconBg: string; iconFg: string; ring: string; accentBg: string; accentOpacity: string }> = {
  primary: { iconBg: "bg-primarySoft", iconFg: "text-primaryDark", ring: "shadow-[0_0_0_4px_rgba(0,87,217,.08)]", accentBg: "bg-primary", accentOpacity: "opacity-90" },
  success: { iconBg: "bg-[#DCFCE7]", iconFg: "text-[#15803D]", ring: "shadow-[0_0_0_4px_rgba(22,163,74,.08)]", accentBg: "bg-[#16A34A]", accentOpacity: "opacity-90" },
  warning: { iconBg: "bg-[#FEF3C7]", iconFg: "text-[#B45309]", ring: "shadow-[0_0_0_4px_rgba(217,119,6,.08)]", accentBg: "bg-[#D97706]", accentOpacity: "opacity-90" },
  danger: { iconBg: "bg-[#FEE2E2]", iconFg: "text-[#DC2626]", ring: "shadow-[0_0_0_4px_rgba(220,38,38,.08)]", accentBg: "bg-[#DC2626]", accentOpacity: "opacity-90" },
  neutral: { iconBg: "bg-[#F1F5F9]", iconFg: "text-ink700", ring: "shadow-none", accentBg: "bg-ink700", accentOpacity: "opacity-20" },
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
    <div className="bg-white border border-border rounded-lg overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(13,23,40,.05)] transition-shadow duration-200">
      {/* Top accent */}
      <div className={clsx("h-[3px]", t.accentBg, t.accentOpacity)} />

      <div className="pt-[18px] px-5 pb-5 flex-1 flex flex-col gap-3">
        {/* Row: label + icon */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10.5px] font-bold tracking-[.1em] text-textFaint uppercase leading-[1.3]">
            {label}
          </span>
          <span className={clsx("w-9 h-9 rounded-[9px] shrink-0 flex items-center justify-center", t.iconBg, t.iconFg, t.ring)}>
            <Icon name={icon} size={17} />
          </span>
        </div>

        {/* Value */}
        <div className="font-display text-[32px] font-black text-ink900 leading-none tracking-[-.02em]">
          {value}
        </div>

        {/* Delta + hint */}
        {(delta || hint) && (
          <div className="flex items-center gap-2 mt-0.5">
            {delta && (
              <span
                className={clsx(
                  "inline-flex items-center gap-[3px] font-mono text-[11px] font-bold py-0.5 px-[7px] rounded",
                  delta.value >= 0 ? "text-[#15803D] bg-[#DCFCE7]" : "text-[#DC2626] bg-[#FEE2E2]"
                )}
              >
                {delta.value >= 0 ? "↑" : "↓"} {Math.abs(delta.value)}%
              </span>
            )}
            {hint && (
              <span className="font-body text-xs text-textFaint">
                {delta ? hint : hint}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
