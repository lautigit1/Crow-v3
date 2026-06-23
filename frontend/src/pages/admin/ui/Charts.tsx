import { color, font } from "@/shared/config/theme";
import type { NamedCount } from "@/entities/dashboard";

const PALETTE = ["#0057D9", "#3B82F6", "#0EA5E9", "#1E293B", "#64748B", "#0D9488", "#7C3AED", "#B45309"];

/** Horizontal bar chart (pure SVG/markup, no dependency). */
export function BarChart({ data, accent = color.primary }: { data: NamedCount[]; accent?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 40px", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: font.body, fontSize: 13, color: color.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
          <div style={{ height: 10, background: color.surface, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: accent, borderRadius: 999, transition: "width .4s ease" }} />
          </div>
          <span style={{ fontFamily: font.mono, fontSize: 13, color: color.ink800, textAlign: "right" }}>{d.value}</span>
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
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: "none" }}>
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
        <text x="50%" y="48%" textAnchor="middle" style={{ fontFamily: font.display, fontWeight: 800, fontSize: 26, fill: color.ink900 }}>{total}</text>
        <text x="50%" y="60%" textAnchor="middle" style={{ fontFamily: font.mono, fontSize: 9, fill: color.textFaint, letterSpacing: "1px" }}>TOTAL</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ fontFamily: font.body, fontSize: 13, color: color.ink800 }}>{s.label}</span>
            <span style={{ fontFamily: font.mono, fontSize: 12, color: color.textFaint, marginLeft: "auto" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div style={{ fontFamily: font.body, fontSize: 14, color: color.textFaint, padding: "24px 0" }}>Sin datos para mostrar.</div>;
}
