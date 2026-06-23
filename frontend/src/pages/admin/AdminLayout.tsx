import * as React from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatedOutlet } from "@/shared/ui/AnimatedOutlet";
import { Logo, Icon, type IconName } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { color, font, radius } from "@/shared/config/theme";

type Item = { to: string; label: string; icon: IconName; end?: boolean };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  { title: "General", items: [{ to: "/admin", label: "Dashboard", icon: "dashboard", end: true }] },
  {
    title: "Catálogo",
    items: [
      { to: "/admin/productos", label: "Productos", icon: "products" },
      { to: "/admin/inventario", label: "Inventario", icon: "inventory" },
      { to: "/admin/categorias", label: "Categorías", icon: "categories" },
      { to: "/admin/marcas", label: "Marcas", icon: "brands" },
    ],
  },
  {
    title: "Operación",
    items: [
      { to: "/admin/cotizaciones", label: "Cotizaciones", icon: "quotes" },
      { to: "/admin/proveedores", label: "Proveedores", icon: "truck" },
      { to: "/admin/usuarios", label: "Usuarios", icon: "users" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/admin/reportes", label: "Reportes", icon: "reports" },
      { to: "/admin/auditoria", label: "Auditoría", icon: "audit" },
      { to: "/admin/configuracion", label: "Configuración", icon: "settings" },
    ],
  },
];

// Breadcrumb label from pathname
function useBreadcrumb() {
  const loc = useLocation();
  const all = GROUPS.flatMap((g) => g.items);
  const match = all.find((i) => i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to));
  return match?.label ?? "Admin";
}

function SidebarItem({ it }: { it: Item }) {
  const [hov, setHov] = React.useState(false);
  return (
    <NavLink
      to={it.to}
      end={it.end}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 11px", borderRadius: radius.md,
        fontFamily: font.body, fontSize: 13.5, fontWeight: 600,
        textDecoration: "none",
        color: isActive ? "#fff" : hov ? "#C4D4E0" : "#5C7A8F",
        background: isActive
          ? "rgba(0,87,217,.22)"
          : hov ? "rgba(255,255,255,.05)" : "transparent",
        borderLeft: `2px solid ${isActive ? color.primary : "transparent"}`,
        transition: "background .14s, color .14s, border-color .14s",
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? "#7FB0FF" : hov ? "#8BA8BF" : "#3D5C72", transition: "color .14s", flexShrink: 0 }}>
            <Icon name={it.icon} size={16} />
          </span>
          {it.label}
        </>
      )}
    </NavLink>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const breadcrumb = useBreadcrumb();

  const initials = (user?.full_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = user ? (user.full_name.charCodeAt(0) * 17) % 360 : 210;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh", background: "#F1F5F9" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        background: color.ink900,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        borderRight: "1px solid rgba(255,255,255,.04)",
      }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: -80, left: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,87,217,.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <Logo variant="dark" size="sm" />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div style={{ fontFamily: font.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: ".18em", color: "#253545", textTransform: "uppercase", padding: "0 11px 8px" }}>
                {g.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {g.items.map((it) => <SidebarItem key={it.to} it={it} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — user card + actions */}
        <div style={{ padding: "10px 10px 14px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          {/* View site */}
          <Link
            to="/"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 11px", borderRadius: radius.md,
              fontFamily: font.body, fontSize: 13, fontWeight: 600,
              color: "#3D5C72", textDecoration: "none",
              transition: "color .14s, background .14s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#8BA8BF"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#3D5C72"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
          >
            <Icon name="external" size={15} /> Ver sitio
          </Link>

          {/* User mini-card */}
          <div style={{
            marginTop: 8,
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: radius.md,
            padding: "12px 12px",
            display: "flex", alignItems: "center", gap: 11,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: `hsl(${hue},55%,36%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font.display, fontSize: 13, fontWeight: 800, color: "#fff",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: "#C4D4E0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 9.5, color: color.primary, letterSpacing: ".08em" }}>ADMIN</div>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              title="Cerrar sesión"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#2A3F52", padding: 4, display: "flex", alignItems: "center",
                transition: "color .14s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#FCA5A5"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2A3F52"; }}
            >
              <Icon name="logout" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: 60,
          background: "rgba(255,255,255,.95)",
          backdropFilter: "saturate(180%) blur(10px)",
          WebkitBackdropFilter: "saturate(180%) blur(10px)",
          borderBottom: `1px solid ${color.border}`,
          boxShadow: "0 1px 0 rgba(0,0,0,.03)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px",
          position: "sticky", top: 0, zIndex: 20,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, letterSpacing: ".08em" }}>ADMIN</span>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color.border} strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: color.ink900, letterSpacing: ".06em", textTransform: "uppercase" }}>{breadcrumb}</span>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: color.ink800, lineHeight: 1.2 }}>{user?.full_name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: color.primary, letterSpacing: ".08em" }}>ADMINISTRADOR</div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `hsl(${hue},55%,46%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font.display, fontSize: 13, fontWeight: 800, color: "#fff",
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: "28px 32px 48px", flex: 1, minWidth: 0 }}>
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}
