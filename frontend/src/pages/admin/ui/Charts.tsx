import { color } from "@/shared/config";
import type { NamedCount } from "@/entities/dashboard";

const PALETTE = ["#0057D9", "#3B82F6", "#0EA5E9", "#1E293B", "#64748B", "#0D9488", "#7C3AED", "#B45309"];

/** Horizontal bar chart (pure SVG/markup, no dependency). */
export function BarChart({ data, accent = color.primary }: { data: NamedCount[]; accent?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <Empty />;
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
          <span className="font-body text-[13px] text-textMuted whitespace-nowrap overflow-hidden text-ellipsis">{d.label}</span>
          <div className="h-2.5 bg-surface rounded-full overflow-hidden">
            {/* `accent` is a caller-supplied color (default token, but overridable per instance) -- genuinely dynamic, stays inline. */}
            <div className="h-full rounded-full transition-[width] duration-[400ms] ease-in-out" style={{ width: `${(d.value / max) * 100}%`, background: accent }} />
          </div>
          <span className="font-mono text-[13px] text-ink800 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut chart for proportional breakdowns. */
export function DonutChart({ data, size = 168 }: { data: NamedCount[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <Empty />;
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const seg = { color: PALETTE[i % PALETTE.length], dash: frac * c, gap: c - frac * c, offset: -offset * c, label: d.label, value: d.value };
    offset += frac;
    return seg;
  });
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={16}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
        <text x="50%" y="48%" textAnchor="middle" className="font-display font-extrabold text-[26px] fill-ink900">{total}</text>
        <text x="50%" y="60%" textAnchor="middle" className="font-mono text-[9px] fill-textFaint tracking-[1px]">TOTAL</text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />
            <span className="font-body text-[13px] text-ink800">{s.label}</span>
            <span className="font-mono text-xs text-textFaint ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="font-body text-sm text-textFaint py-6">Sin datos para mostrar.</div>;
}
