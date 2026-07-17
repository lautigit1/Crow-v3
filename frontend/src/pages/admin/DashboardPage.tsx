import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { CenteredSpinner, Icon } from "@/shared/ui";
import { StatCard } from "./ui/StatCard";
import { DonutChart, BarChart } from "./ui/Charts";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { dashboardApi, type Analytics, type DashboardStats } from "@/entities/dashboard";
import { productApi, type Product } from "@/entities/product";
import { auditApi, type AuditLog } from "@/entities/audit";
import { formatDate, formatPrice, formatDateTime } from "@/shared/lib/format";
import { useAuth } from "@/entities/session";
import { color } from "@/shared/config";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CARD_CLASS = "bg-white border border-border rounded-lg shadow-[0_1px_3px_rgba(13,23,40,.05)] overflow-hidden";
const PANEL_HEADER_CLASS = "flex items-center gap-3 py-[15px] px-5";

// ── Quick action card ─────────────────────────────────────────────────────────
// Only 6 fixed brand/tint combos are ever used (below, in this same file),
// not free-form per-call colors -- so like `TrustBand`/`StatCard`, each
// rest/hover state is precomputed as a complete literal Tailwind class
// string rather than a `hov` useState + inline style object. Tailwind's
// arbitrary-value scanner needs full literal tokens in the source, so these
// can't be built via template-string interpolation from a hex variable.
type QuickTone = "primary" | "purple" | "cyan" | "amber" | "green" | "slate";

const QUICK_TONES: Record<QuickTone, {
  linkHoverBg: string; hoverBorder: string; hoverShadow: string;
  iconBg: string; iconFg: string; iconHover: string;
}> = {
  primary: {
    linkHoverBg: "hover:bg-[#EEF4FF]", hoverBorder: "hover:border-[#0057D930]", hoverShadow: "hover:shadow-[0_8px_24px_#0057D920]",
    iconBg: "bg-[#EEF4FF]", iconFg: "text-primary", iconHover: "group-hover:bg-[#0057D922] group-hover:border-[#0057D930]",
  },
  purple: {
    linkHoverBg: "hover:bg-[#F5F3FF]", hoverBorder: "hover:border-[#7C3AED30]", hoverShadow: "hover:shadow-[0_8px_24px_#7C3AED20]",
    iconBg: "bg-[#F5F3FF]", iconFg: "text-[#7C3AED]", iconHover: "group-hover:bg-[#7C3AED22] group-hover:border-[#7C3AED30]",
  },
  cyan: {
    linkHoverBg: "hover:bg-[#ECFEFF]", hoverBorder: "hover:border-[#0891B230]", hoverShadow: "hover:shadow-[0_8px_24px_#0891B220]",
    iconBg: "bg-[#ECFEFF]", iconFg: "text-[#0891B2]", iconHover: "group-hover:bg-[#0891B222] group-hover:border-[#0891B230]",
  },
  amber: {
    linkHoverBg: "hover:bg-[#FFFBEB]", hoverBorder: "hover:border-[#D9770630]", hoverShadow: "hover:shadow-[0_8px_24px_#D9770620]",
    iconBg: "bg-[#FFFBEB]", iconFg: "text-[#D97706]", iconHover: "group-hover:bg-[#D9770622] group-hover:border-[#D9770630]",
  },
  green: {
    linkHoverBg: "hover:bg-[#F0FDF4]", hoverBorder: "hover:border-[#05966930]", hoverShadow: "hover:shadow-[0_8px_24px_#05966920]",
    iconBg: "bg-[#F0FDF4]", iconFg: "text-[#059669]", iconHover: "group-hover:bg-[#05966922] group-hover:border-[#05966930]",
  },
  slate: {
    linkHoverBg: "hover:bg-[#F8FAFC]", hoverBorder: "hover:border-[#1E293B30]", hoverShadow: "hover:shadow-[0_8px_24px_#1E293B20]",
    iconBg: "bg-[#F8FAFC]", iconFg: "text-ink700", iconHover: "group-hover:bg-[#1E293B22] group-hover:border-[#1E293B30]",
  },
};

function QuickAction({
  icon, label, to, tone,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string; to: string; tone: QuickTone;
}) {
  const t = QUICK_TONES[tone];
  return (
    <Link
      to={to}
      className={clsx(
        "group flex-1 min-w-0 flex flex-col items-center gap-2.5 py-[18px] px-3 bg-white border border-border rounded-lg no-underline cursor-pointer shadow-[0_1px_3px_rgba(13,23,40,.04)] [transition:background-color_.16s,border-color_.16s,transform_.16s,box-shadow_.16s] hover:-translate-y-0.5",
        t.linkHoverBg, t.hoverBorder, t.hoverShadow
      )}
    >
      <div className={clsx("w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center border border-border [transition:background-color_.16s,border-color_.16s]", t.iconBg, t.iconFg, t.iconHover)}>
        <Icon name={icon} size={18} />
      </div>
      <span className="font-body text-xs font-semibold text-textMuted text-center leading-[1.3] transition-colors duration-[160ms] group-hover:text-ink900">
        {label}
      </span>
    </Link>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({
  title, icon, iconColor = color.primary, action, children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  iconColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={CARD_CLASS}>
      <div className={PANEL_HEADER_CLASS}>
        {/* `iconColor` is a free-form hex prop shared across pages with
            different accents per call -- genuinely dynamic, stays inline. */}
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center" style={{ background: `${iconColor}18`, color: iconColor }}>
          <Icon name={icon} size={16} />
        </div>
        <span className="font-display text-[15px] font-bold text-ink900 flex-1">{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Mini link button ──────────────────────────────────────────────────────────
function MiniLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="font-body text-[12.5px] font-semibold text-primary no-underline whitespace-nowrap transition-colors duration-[140ms] hover:text-primaryDark">
      {children}
    </Link>
  );
}

// ── Stock bar ────────────────────────────────────────────────────────────────
function StockBar({ stock, max = 20 }: { stock: number; max?: number }) {
  const pct = Math.min(100, (stock / max) * 100);
  const barBg = stock <= 0 ? "bg-danger" : stock <= 5 ? "bg-[#D97706]" : "bg-[#16A34A]";
  const textColor = stock <= 0 ? "text-danger" : stock <= 5 ? "text-[#D97706]" : "text-[#16A34A]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-surface rounded-[2px] overflow-hidden">
        <div className={clsx("h-full rounded-[2px] transition-[width] duration-300", barBg)} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx("font-mono text-[11px] font-bold min-w-9 text-right", textColor)}>
        {stock <= 0 ? "0 u." : `${stock} u.`}
      </span>
    </div>
  );
}

// ── Audit action dot ─────────────────────────────────────────────────────────
function ActionDot({ action }: { action: string }) {
  const dotClass = action.includes("delete") ? "bg-danger"
    : action.includes("create") ? "bg-[#16A34A]"
    : action.includes("update") ? "bg-primary"
    : "bg-textFaint";
  return <div className={clsx("w-2 h-2 rounded-full shrink-0 mt-1", dotClass)} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([dashboardApi.stats(), dashboardApi.analytics()])
      .then(([s, a]) => { setStats(s); setAnalytics(a); })
      .catch((err) => {
        console.error("[DashboardPage] no se pudieron cargar stats/analytics:", err);
        setError(true);
      });
    // Widgets secundarios: si fallan, el dashboard principal sigue siendo
    // usable -- se loguea y el widget queda vacío en vez de tumbar la página.
    productApi.list({ sort: "stock_asc", limit: 6 }).then((r) => setLowStock(r.items)).catch((err) => {
      console.error("[DashboardPage] no se pudo cargar el widget de stock bajo:", err);
      setLowStock([]);
    });
    auditApi.list(7).then(setAudit).catch((err) => {
      console.error("[DashboardPage] no se pudo cargar el widget de auditoría reciente:", err);
      setAudit([]);
    });
  }, []);

  if (error) return (
    <div className={clsx(CARD_CLASS, "p-8 text-danger font-body")}>
      No se pudo cargar el dashboard. ¿Está corriendo el backend?
    </div>
  );
  if (!stats || !analytics) return <CenteredSpinner label="Cargando dashboard…" />;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-5">

      {/* ── Welcome banner ── */}
      <div className="bg-ink900 rounded-lg py-6 px-7 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.2)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[.12em] text-[#3A5A7A] mb-2">
              {formatDate(now.toISOString()).toUpperCase()} · {now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <h1 className="font-display text-[26px] font-black text-white tracking-[-.02em] mb-1.5">
              {greeting}, {firstName}.
            </h1>
            <p className="font-body text-sm text-[#5E819D] m-0">
              Tenés <strong className="text-[#FCD34D]">{stats.pending_quotes}</strong> cotizaci{stats.pending_quotes === 1 ? "ón pendiente" : "ones pendientes"} y{" "}
              <strong className={stats.out_of_stock > 0 ? "text-[#F87171]" : "text-[#86EFAC]"}>{stats.out_of_stock}</strong> producto{stats.out_of_stock === 1 ? "" : "s"} sin stock.
            </p>
          </div>
          <div className="flex gap-2.5">
            <div className="text-center bg-[rgba(255,255,255,.05)] border border-[rgba(255,255,255,.08)] rounded-md py-3.5 px-5">
              <div className="font-display text-[28px] font-black text-white leading-none">{stats.total_products}</div>
              <div className="font-mono text-[10px] text-[#3A5A7A] mt-1 tracking-[.08em]">PRODUCTOS</div>
            </div>
            <div className="text-center bg-[rgba(255,255,255,.05)] border border-[rgba(255,255,255,.08)] rounded-md py-3.5 px-5">
              <div className="font-display text-[28px] font-black text-[#7FB0FF] leading-none">{formatPrice(analytics.inventory_value)}</div>
              <div className="font-mono text-[10px] text-[#3A5A7A] mt-1 tracking-[.08em]">INVENTARIO</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex gap-2.5">
        <QuickAction icon="plus" label="Nuevo producto" to="/admin/productos" tone="primary" />
        <QuickAction icon="truck" label="Nuevo proveedor" to="/admin/proveedores" tone="purple" />
        <QuickAction icon="quotes" label="Cotizaciones" to="/admin/cotizaciones" tone="cyan" />
        <QuickAction icon="inventory" label="Inventario" to="/admin/inventario" tone="amber" />
        <QuickAction icon="reports" label="Reportes" to="/admin/reportes" tone="green" />
        <QuickAction icon="users" label="Usuarios" to="/admin/usuarios" tone="slate" />
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-3.5">
        <StatCard icon="products" label="Productos" value={stats.total_products} tone="primary" />
        <StatCard icon="alert" label="Sin stock" value={stats.out_of_stock} tone={stats.out_of_stock > 0 ? "danger" : "neutral"} />
        <StatCard icon="quotes" label="Cotiz. pendientes" value={stats.pending_quotes} tone={stats.pending_quotes > 0 ? "warning" : "neutral"} />
        <StatCard icon="users" label="Usuarios" value={stats.registered_users} tone="success" />
      </div>

      {/* ── KPI row 2 ── */}
      <div className="grid grid-cols-4 gap-3.5">
        <StatCard icon="categories" label="Categorías" value={stats.total_categories} />
        <StatCard icon="brands" label="Marcas" value={stats.total_brands} />
        <StatCard icon="truck" label="Proveedores" value={stats.total_suppliers} />
        <StatCard icon="shieldCheck" label="Prov. activos" value={stats.active_suppliers} tone="success" />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Productos por categoría" icon="categories" iconColor="#7C3AED">
          <BarChart data={analytics.products_by_category} />
        </Panel>
        <Panel title="Cotizaciones por estado" icon="quotes" iconColor="#0891B2">
          <DonutChart data={analytics.quotes_by_status} />
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Productos por proveedor" icon="truck" iconColor="#D97706">
          <BarChart data={analytics.products_by_supplier} />
        </Panel>
        <Panel title="Estado del stock" icon="inventory" iconColor="#059669">
          <DonutChart data={[
            { label: "En stock", value: analytics.stock_summary.in_stock },
            { label: "Stock bajo", value: analytics.stock_summary.low_stock },
            { label: "Sin stock", value: analytics.stock_summary.out_of_stock },
          ]} />
        </Panel>
      </div>

      {/* ── Recent quotes ── */}
      <div className={CARD_CLASS}>
        <div className={clsx(PANEL_HEADER_CLASS, "justify-between")}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#ECFEFF] flex items-center justify-center text-[#0891B2]">
              <Icon name="quotes" size={16} />
            </div>
            <span className="font-display text-[15px] font-bold text-ink900">Últimas cotizaciones</span>
          </div>
          <MiniLink to="/admin/cotizaciones">Ver todas →</MiniLink>
        </div>

        {stats.recent_quotes.length === 0 ? (
          <div className="py-5 px-5 font-body text-sm text-textFaint">Sin cotizaciones recientes.</div>
        ) : stats.recent_quotes.map((q, i) => (
          <div
            key={q.id}
            className={clsx(
              "flex items-center justify-between gap-4 py-3.5 px-5 border-t border-border",
              i % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"
            )}
          >
            {/* Avatar -- `hsl(...)` seeded from the customer's name, genuinely per-record dynamic. */}
            <div
              className="w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center font-display text-xs font-extrabold"
              style={{
                background: `hsl(${(q.customer_name?.charCodeAt(0) ?? 0) * 23 % 360},45%,88%)`,
                color: `hsl(${(q.customer_name?.charCodeAt(0) ?? 0) * 23 % 360},45%,35%)`,
              }}
            >
              {(q.customer_name ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-body text-[13.5px] font-semibold text-ink900 whitespace-nowrap overflow-hidden text-ellipsis">
                {q.customer_name}
              </div>
              <div className="font-body text-[12.5px] text-textMuted whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">
                {q.message}
              </div>
            </div>
            <div className="text-right shrink-0">
              <StatusBadge status={q.status} />
              <div className="font-mono text-[10.5px] text-textFaint mt-1">#{q.id} · {formatDate(q.created_at)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom row: stock + activity ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Stock crítico */}
        <div className={CARD_CLASS}>
          <div className={clsx(PANEL_HEADER_CLASS, "justify-between")}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                <Icon name="alert" size={16} />
              </div>
              <span className="font-display text-[15px] font-bold text-ink900">Stock crítico</span>
            </div>
            <MiniLink to="/admin/inventario">Ver inventario →</MiniLink>
          </div>

          {lowStock.length === 0 ? (
            <div className="py-5 px-5 font-body text-sm text-textFaint">Sin datos de stock.</div>
          ) : lowStock.map((p) => (
            <div key={p.id} className="py-3 px-5 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <div className="font-body text-[13px] font-semibold text-ink900">{p.name}</div>
                  <div className="font-mono text-[10.5px] text-textFaint mt-px">
                    {p.sku}{p.supplier ? ` · ${p.supplier.name}` : ""}
                  </div>
                </div>
                <span className={clsx(
                  "font-mono text-[11px] font-bold py-0.5 px-2 rounded",
                  p.stock <= 0 ? "bg-dangerSoft text-danger" : "bg-warningSoft text-warning"
                )}>
                  {p.stock <= 0 ? "Sin stock" : `${p.stock} u.`}
                </span>
              </div>
              <StockBar stock={p.stock} max={20} />
            </div>
          ))}
        </div>

        {/* Actividad reciente */}
        <div className={CARD_CLASS}>
          <div className={PANEL_HEADER_CLASS}>
            <div className="w-8 h-8 rounded-md bg-[#F0FDF4] flex items-center justify-center text-[#059669]">
              <Icon name="audit" size={16} />
            </div>
            <span className="font-display text-[15px] font-bold text-ink900">Actividad reciente</span>
          </div>

          {audit.length === 0 ? (
            <div className="py-5 px-5 font-body text-sm text-textFaint">Sin eventos registrados.</div>
          ) : (
            <div className="py-3 px-5 flex flex-col">
              {audit.map((a, i) => (
                <div key={a.id} className={clsx("flex gap-3", i < audit.length - 1 ? "pb-3.5 mb-3.5 border-b border-border" : "pb-0 mb-0")}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <ActionDot action={a.action} />
                    {i < audit.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold text-ink800">{a.action}</div>
                    <div className="font-body text-xs text-textFaint mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                      {a.actor_email ?? "—"}{a.detail ? ` · ${a.detail}` : ""}
                    </div>
                    <div className="font-mono text-[10.5px] text-textFaint mt-[3px]">{formatDateTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
