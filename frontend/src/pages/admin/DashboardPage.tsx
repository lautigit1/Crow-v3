import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, Icon } from "@/shared/ui";
import { StatCard } from "./ui/StatCard";
import { DonutChart, BarChart } from "./ui/Charts";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { dashboardApi, type Analytics, type DashboardStats } from "@/entities/dashboard";
import { productApi, type Product } from "@/entities/product";
import { auditApi, type AuditLog } from "@/entities/audit";
import { formatDate, formatPrice, formatDateTime } from "@/shared/lib/format";
import { useAuth } from "@/app/providers/AuthProvider";
import { color, font, radius } from "@/shared/config/theme";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${color.border}`,
  borderRadius: radius.lg,
  boxShadow: "0 1px 3px rgba(13,23,40,.05)",
  overflow: "hidden",
};

const PANEL_HEADER: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "15px 20px",
  borderBottom: `1px solid ${color.border}`,
};

// ── Quick action card ─────────────────────────────────────────────────────────
function QuickAction({
  icon, label, to, bg, fg,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string; to: string; bg: string; fg: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 10, padding: "18px 12px",
        background: hov ? bg : "#fff",
        border: `1px solid ${hov ? `${fg}30` : color.border}`,
        borderRadius: radius.lg,
        textDecoration: "none",
        transition: "background .16s, border-color .16s, transform .16s, box-shadow .16s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 24px ${fg}20` : "0 1px 3px rgba(13,23,40,.04)",
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: hov ? `${fg}22` : `${bg}`,
        border: `1px solid ${hov ? `${fg}30` : color.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: fg, transition: "background .16s, border-color .16s",
      }}>
        <Icon name={icon} size={18} />
      </div>
      <span style={{
        fontFamily: font.body, fontSize: 12, fontWeight: 600,
        color: hov ? color.ink900 : color.textMuted,
        textAlign: "center", lineHeight: 1.3,
        transition: "color .16s",
      }}>
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
    <div style={CARD}>
      <div style={PANEL_HEADER}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${iconColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: iconColor,
        }}>
          <Icon name={icon} size={16} />
        </div>
        <span style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900, flex: 1 }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ── Mini link button ──────────────────────────────────────────────────────────
function MiniLink({ to, children }: { to: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: font.body, fontSize: 12.5, fontWeight: 600,
        color: hov ? color.primaryDark : color.primary,
        textDecoration: "none", whiteSpace: "nowrap",
        transition: "color .14s",
      }}
    >
      {children}
    </Link>
  );
}

// ── Stock bar ────────────────────────────────────────────────────────────────
function StockBar({ stock, max = 20 }: { stock: number; max?: number }) {
  const pct = Math.min(100, (stock / max) * 100);
  const barColor = stock <= 0 ? color.danger : stock <= 5 ? "#D97706" : "#16A34A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: color.surface, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width .3s" }} />
      </div>
      <span style={{
        fontFamily: font.mono, fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: "right",
        color: barColor,
      }}>
        {stock <= 0 ? "0 u." : `${stock} u.`}
      </span>
    </div>
  );
}

// ── Audit action dot ─────────────────────────────────────────────────────────
function ActionDot({ action }: { action: string }) {
  const col = action.includes("delete") ? color.danger
    : action.includes("create") ? "#16A34A"
    : action.includes("update") ? color.primary
    : color.textFaint;
  return (
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0, marginTop: 4 }} />
  );
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
      .catch(() => setError(true));
    productApi.list({ sort: "stock_asc", limit: 6 }).then((r) => setLowStock(r.items)).catch(() => setLowStock([]));
    auditApi.list(7).then(setAudit).catch(() => setAudit([]));
  }, []);

  if (error) return (
    <div style={{ ...CARD, padding: 32, color: color.danger, fontFamily: font.body }}>
      No se pudo cargar el dashboard. ¿Está corriendo el backend?
    </div>
  );
  if (!stats || !analytics) return <CenteredSpinner label="Cargando dashboard…" />;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Welcome banner ── */}
      <div style={{
        background: color.ink900, borderRadius: radius.lg,
        padding: "24px 28px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,87,217,.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".12em", color: "#3A5A7A", marginBottom: 8 }}>
              {formatDate(now.toISOString()).toUpperCase()} · {now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-.02em", marginBottom: 6 }}>
              {greeting}, {firstName}.
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 14, color: "#4E6B82", margin: 0 }}>
              Tenés <strong style={{ color: "#FCD34D" }}>{stats.pending_quotes}</strong> cotizaci{stats.pending_quotes === 1 ? "ón pendiente" : "ones pendientes"} y <strong style={{ color: stats.out_of_stock > 0 ? "#F87171" : "#86EFAC" }}>{stats.out_of_stock}</strong> producto{stats.out_of_stock === 1 ? "" : "s"} sin stock.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ textAlign: "center", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: radius.md, padding: "14px 20px" }}>
              <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{stats.total_products}</div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: "#3A5A7A", marginTop: 4, letterSpacing: ".08em" }}>PRODUCTOS</div>
            </div>
            <div style={{ textAlign: "center", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: radius.md, padding: "14px 20px" }}>
              <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 900, color: "#7FB0FF", lineHeight: 1 }}>{formatPrice(analytics.inventory_value)}</div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: "#3A5A7A", marginTop: 4, letterSpacing: ".08em" }}>INVENTARIO</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: "flex", gap: 10 }}>
        <QuickAction icon="plus"      label="Nuevo producto"    to="/admin/productos"     bg="#EEF4FF" fg={color.primary} />
        <QuickAction icon="truck"     label="Nuevo proveedor"   to="/admin/proveedores"   bg="#F5F3FF" fg="#7C3AED" />
        <QuickAction icon="quotes"    label="Cotizaciones"      to="/admin/cotizaciones"  bg="#ECFEFF" fg="#0891B2" />
        <QuickAction icon="inventory" label="Inventario"        to="/admin/inventario"    bg="#FFFBEB" fg="#D97706" />
        <QuickAction icon="reports"   label="Reportes"          to="/admin/reportes"      bg="#F0FDF4" fg="#059669" />
        <QuickAction icon="users"     label="Usuarios"          to="/admin/usuarios"      bg="#F8FAFC" fg={color.ink700} />
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard icon="products"   label="Productos"          value={stats.total_products}     tone="primary" />
        <StatCard icon="alert"      label="Sin stock"          value={stats.out_of_stock}       tone={stats.out_of_stock > 0 ? "danger" : "neutral"} />
        <StatCard icon="quotes"     label="Cotiz. pendientes"  value={stats.pending_quotes}     tone={stats.pending_quotes > 0 ? "warning" : "neutral"} />
        <StatCard icon="users"      label="Usuarios"           value={stats.registered_users}   tone="success" />
      </div>

      {/* ── KPI row 2 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard icon="categories" label="Categorías"         value={stats.total_categories} />
        <StatCard icon="brands"     label="Marcas"             value={stats.total_brands} />
        <StatCard icon="truck"      label="Proveedores"        value={stats.total_suppliers} />
        <StatCard icon="shieldCheck" label="Prov. activos"     value={stats.active_suppliers}   tone="success" />
      </div>

      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Productos por categoría" icon="categories" iconColor="#7C3AED">
          <BarChart data={analytics.products_by_category} />
        </Panel>
        <Panel title="Cotizaciones por estado" icon="quotes" iconColor="#0891B2">
          <DonutChart data={analytics.quotes_by_status} />
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Productos por proveedor" icon="truck" iconColor="#D97706">
          <BarChart data={analytics.products_by_supplier} />
        </Panel>
        <Panel title="Estado del stock" icon="inventory" iconColor="#059669">
          <DonutChart data={[
            { label: "En stock", value: analytics.stock.in_stock },
            { label: "Stock bajo", value: analytics.stock.low_stock },
            { label: "Sin stock", value: analytics.stock.out_of_stock },
          ]} />
        </Panel>
      </div>

      {/* ── Recent quotes ── */}
      <div style={CARD}>
        <div style={{ ...PANEL_HEADER, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ECFEFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0891B2" }}>
              <Icon name="quotes" size={16} />
            </div>
            <span style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900 }}>Últimas cotizaciones</span>
          </div>
          <MiniLink to="/admin/cotizaciones">Ver todas →</MiniLink>
        </div>

        {stats.recent_quotes.length === 0 ? (
          <div style={{ padding: "20px 20px", fontFamily: font.body, fontSize: 14, color: color.textFaint }}>Sin cotizaciones recientes.</div>
        ) : stats.recent_quotes.map((q, i) => (
          <div key={q.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: "14px 20px",
            borderTop: `1px solid ${color.border}`,
            background: i % 2 === 0 ? "#fff" : "#FAFBFC",
          }}>
            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: `hsl(${(q.customer_name?.charCodeAt(0) ?? 0) * 23 % 360},45%,88%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font.display, fontSize: 12, fontWeight: 800,
              color: `hsl(${(q.customer_name?.charCodeAt(0) ?? 0) * 23 % 360},45%,35%)`,
            }}>
              {(q.customer_name ?? "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {q.customer_name}
              </div>
              <div style={{ fontFamily: font.body, fontSize: 12.5, color: color.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                {q.message}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <StatusBadge status={q.status} />
              <div style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textFaint, marginTop: 4 }}>#{q.id} · {formatDate(q.created_at)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom row: stock + activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Stock crítico */}
        <div style={CARD}>
          <div style={{ ...PANEL_HEADER, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706" }}>
                <Icon name="alert" size={16} />
              </div>
              <span style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900 }}>Stock crítico</span>
            </div>
            <MiniLink to="/admin/inventario">Ver inventario →</MiniLink>
          </div>

          {lowStock.length === 0 ? (
            <div style={{ padding: "20px 20px", fontFamily: font.body, fontSize: 14, color: color.textFaint }}>Sin datos de stock.</div>
          ) : lowStock.map((p) => (
            <div key={p.id} style={{ padding: "12px 20px", borderTop: `1px solid ${color.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink900 }}>{p.name}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textFaint, marginTop: 1 }}>
                    {p.sku}{p.supplier ? ` · ${p.supplier.name}` : ""}
                  </div>
                </div>
                <span style={{
                  fontFamily: font.mono, fontSize: 11, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 4, background: p.stock <= 0 ? color.dangerSoft : color.warningSoft,
                  color: p.stock <= 0 ? color.danger : color.warning,
                }}>
                  {p.stock <= 0 ? "Sin stock" : `${p.stock} u.`}
                </span>
              </div>
              <StockBar stock={p.stock} max={20} />
            </div>
          ))}
        </div>

        {/* Actividad reciente */}
        <div style={CARD}>
          <div style={PANEL_HEADER}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
              <Icon name="audit" size={16} />
            </div>
            <span style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900 }}>Actividad reciente</span>
          </div>

          {audit.length === 0 ? (
            <div style={{ padding: "20px 20px", fontFamily: font.body, fontSize: 14, color: color.textFaint }}>Sin eventos registrados.</div>
          ) : (
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
              {audit.map((a, i) => (
                <div key={a.id} style={{ display: "flex", gap: 12, paddingBottom: i < audit.length - 1 ? 14 : 0, marginBottom: i < audit.length - 1 ? 14 : 0, borderBottom: i < audit.length - 1 ? `1px solid ${color.border}` : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <ActionDot action={a.action} />
                    {i < audit.length - 1 && <div style={{ width: 1, flex: 1, background: color.border }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 700, color: color.ink800 }}>{a.action}</div>
                    <div style={{ fontFamily: font.body, fontSize: 12, color: color.textFaint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.actor_email ?? "—"}{a.detail ? ` · ${a.detail}` : ""}
                    </div>
                    <div style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textFaint, marginTop: 3 }}>{formatDateTime(a.created_at)}</div>
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
