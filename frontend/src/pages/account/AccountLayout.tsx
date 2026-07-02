import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Container, Avatar, Icon, type IconName } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { color, font, radius } from "@/shared/config/theme";

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

const LINKS: NavItem[] = [
  { to: "/cuenta",               label: "Mi perfil",        icon: "users",    end: true },
  { to: "/cuenta/cotizaciones",  label: "Mis cotizaciones", icon: "quotes" },
  { to: "/cuenta/pedidos",       label: "Mis pedidos",      icon: "box" },
  { to: "/cuenta/favoritos",     label: "Favoritos",        icon: "star" },
  { to: "/cuenta/configuracion", label: "Configuración",    icon: "settings" },
];

function SidebarLink({ to, label, icon, end }: NavItem) {
  const [hov, setHov] = useState(false);
  return (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: radius.sm,
        fontFamily: font.body,
        fontSize: 13.5,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? color.primary : hov ? color.ink900 : color.textMuted,
        background: isActive ? color.primarySoft : hov ? color.surface : "transparent",
        textDecoration: "none",
        transition: "background .12s, color .12s",
        borderLeft: `3px solid ${isActive ? color.primary : "transparent"}`,
        marginLeft: -1,
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isActive ? `${color.primary}18` : hov ? `${color.primary}0D` : color.surface,
            color: isActive ? color.primary : hov ? color.ink700 : color.textFaint,
            transition: "background .12s, color .12s",
          }}>
            <Icon name={icon} size={15} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

export function AccountLayout() {
  const { user, isAdmin } = useAuth();
  return (
    <div style={{ background: "#F1F5F9", minHeight: "70vh", padding: "40px 0 80px" }}>
      <Container style={{ display: "grid", gridTemplateColumns: "268px 1fr", gap: 28, alignItems: "start" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          border: `1px solid ${color.border}`,
          borderRadius: 14,
          overflow: "hidden",
          position: "sticky",
          top: 90,
          boxShadow: "0 4px 24px rgba(7,17,31,.06)",
        }}>
          {/* Dark header */}
          <div style={{ position: "relative", overflow: "hidden", background: color.ink900, padding: "22px 20px 20px" }}>
            {/* Accent line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)`,
            }} />
            {/* Glow */}
            <div style={{
              position: "absolute", top: -50, right: -20, width: 160, height: 160,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,87,217,.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
              <Avatar name={user?.full_name ?? "?"} size={58} />
              <div>
                <div style={{
                  fontFamily: font.display, fontSize: 15, fontWeight: 800,
                  color: "#fff", letterSpacing: "-.02em", lineHeight: 1.2,
                }}>
                  {user?.full_name}
                </div>
                <div style={{
                  fontFamily: font.mono, fontSize: 10.5, color: "#7FB0FF",
                  marginTop: 5, wordBreak: "break-all",
                }}>
                  {user?.email}
                </div>
              </div>
              <span style={{
                fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                letterSpacing: ".12em", textTransform: "uppercase",
                color: isAdmin ? "#FCD34D" : "#86EFAC",
                background: isAdmin ? "rgba(252,211,77,.12)" : "rgba(134,239,172,.12)",
                border: `1px solid ${isAdmin ? "rgba(252,211,77,.28)" : "rgba(134,239,172,.28)"}`,
                padding: "3px 10px", borderRadius: radius.pill,
              }}>
                {isAdmin ? "Administrador" : "Cliente"}
              </span>
            </div>
          </div>

          {/* Nav */}
          <div style={{ background: "#fff", padding: "10px 12px 14px" }}>
            <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: color.textFaint, padding: "8px 4px 6px 17px" }}>
              Mi cuenta
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {LINKS.map((l) => (
                <SidebarLink key={l.to} {...l} />
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Content ── */}
        <div>
          <Outlet />
        </div>
      </Container>
    </div>
  );
}
