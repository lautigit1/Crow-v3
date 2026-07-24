import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Icon, type IconName } from "@/shared/ui";
import { color } from "@/shared/config";
import { formatNumber, formatPrice } from "@/shared/lib/format";
import { dashboardApi, type TrendPeriod, type Trends } from "@/entities/dashboard";

const CARD_CLASS =
  "bg-white border border-border rounded-lg shadow-[0_1px_3px_rgba(13,23,40,.05)] overflow-hidden";

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "12m", label: "12 meses" },
];

// Colores alineados a los acentos que ya usa el dashboard: ingresos = azul
// primario, pedidos = ámbar, cotizaciones = cian.
const REVENUE = color.primary;
const ORDERS = "#D97706";
const QUOTES = "#0891B2";

type Granularity = Trends["granularity"];

function axisLabel(iso: string, granularity: Granularity): string {
  const d = new Date(`${iso}T00:00:00`);
  if (granularity === "month") return d.toLocaleDateString("es-AR", { month: "short" });
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function fullLabel(iso: string, granularity: Granularity): string {
  const d = new Date(`${iso}T00:00:00`);
  if (granularity === "month") return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  if (granularity === "week") return `Semana del ${d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}`;
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" });
}

function SectionCard({ title, icon, iconColor, children }: {
  title: string;
  icon: IconName;
  iconColor: string;
  children: ReactNode;
}) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center gap-3 py-[15px] px-5">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center"
             style={{ background: `${iconColor}18`, color: iconColor }}>
          <Icon name={icon} size={16} />
        </div>
        <span className="font-display text-[15px] font-bold text-ink900">{title}</span>
      </div>
      <div className="px-2 pb-4 pt-1">{children}</div>
    </div>
  );
}

function TotalCard({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className={`${CARD_CLASS} py-3.5 px-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
        <span className="font-body text-xs font-semibold text-textMuted">{label}</span>
      </div>
      <div className="font-display text-[22px] font-black text-ink900 leading-none">{value}</div>
    </div>
  );
}

// Estilo compartido del tooltip nativo de Recharts (tipado, sin componente custom).
const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 8,
    border: `1px solid ${color.border}`,
    boxShadow: "0 4px 16px rgba(13,23,40,.12)",
    fontSize: 12.5,
  },
  labelStyle: { color: color.textFaint, fontSize: 11, textTransform: "capitalize" as const },
};

export function TrendsSection() {
  const [period, setPeriod] = useState<TrendPeriod>("30d");
  const [data, setData] = useState<Trends | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(false);
    dashboardApi
      .trends(period)
      .then((d) => { if (alive) setData(d); })
      .catch((err) => {
        console.error("[TrendsSection] no se pudieron cargar las tendencias:", err);
        if (alive) setError(true);
      });
    return () => { alive = false; };
  }, [period]);

  const totals = useMemo(() => {
    const points = data?.points ?? [];
    return points.reduce(
      (acc, p) => ({
        revenue: acc.revenue + p.revenue,
        orders: acc.orders + p.orders,
        quotes: acc.quotes + p.quotes,
      }),
      { revenue: 0, orders: 0, quotes: 0 },
    );
  }, [data]);

  const points = data?.points ?? [];
  const granularity: Granularity = data?.granularity ?? "day";

  return (
    <div className="flex flex-col gap-4">
      {/* Header + selector de período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primarySoft text-primaryDark flex items-center justify-center">
            <Icon name="trendingUp" size={16} />
          </div>
          <span className="font-display text-[17px] font-black text-ink900 tracking-[-.01em]">Tendencias</span>
        </div>
        <div className="inline-flex bg-surface border border-border rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={
                "font-body text-[12.5px] font-semibold px-3 py-1.5 rounded-md transition-colors duration-150 " +
                (period === p.value
                  ? "bg-white text-ink900 shadow-[0_1px_2px_rgba(13,23,40,.08)]"
                  : "text-textMuted hover:text-ink900")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totales del período */}
      <div className="grid grid-cols-3 gap-3.5">
        <TotalCard label="Ingresos" value={formatPrice(totals.revenue)} dot={REVENUE} />
        <TotalCard label="Pedidos" value={formatNumber(totals.orders)} dot={ORDERS} />
        <TotalCard label="Cotizaciones" value={formatNumber(totals.quotes)} dot={QUOTES} />
      </div>

      {error ? (
        <div className={`${CARD_CLASS} p-6 font-body text-sm text-danger`}>
          No se pudieron cargar las tendencias.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
          <SectionCard title="Ingresos" icon="trendingUp" iconColor={REVENUE}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={points} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REVENUE} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={REVENUE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={color.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: color.textFaint, fontSize: 11 }} tickLine={false}
                       axisLine={{ stroke: color.border }} minTickGap={16}
                       tickFormatter={(v) => axisLabel(String(v), granularity)} />
                <YAxis tick={{ fill: color.textFaint, fontSize: 11 }} tickLine={false} axisLine={false} width={70}
                       tickFormatter={(v) => formatPrice(Number(v))} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value) => [formatPrice(Number(value)), "Ingresos"]}
                  labelFormatter={(label) => fullLabel(String(label), granularity)}
                />
                <Area type="monotone" dataKey="revenue" name="Ingresos" stroke={REVENUE} strokeWidth={2}
                      fill="url(#revFill)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Pedidos y cotizaciones" icon="quotes" iconColor={QUOTES}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={points} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={color.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: color.textFaint, fontSize: 11 }} tickLine={false}
                       axisLine={{ stroke: color.border }} minTickGap={16}
                       tickFormatter={(v) => axisLabel(String(v), granularity)} />
                <YAxis tick={{ fill: color.textFaint, fontSize: 11 }} tickLine={false} axisLine={false}
                       width={32} allowDecimals={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value) => formatNumber(Number(value))}
                  labelFormatter={(label) => fullLabel(String(label), granularity)}
                />
                <Line type="monotone" dataKey="orders" name="Pedidos" stroke={ORDERS} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="quotes" name="Cotizaciones" stroke={QUOTES} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
