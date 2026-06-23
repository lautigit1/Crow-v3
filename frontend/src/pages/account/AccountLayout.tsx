import type * as React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Container, Avatar } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { color, font, radius } from "@/shared/config/theme";

const LINKS = [
  { to: "/cuenta", label: "Mi perfil", end: true },
  { to: "/cuenta/cotizaciones", label: "Mis cotizaciones" },
  { to: "/cuenta/pedidos", label: "Mis pedidos" },
  { to: "/cuenta/favoritos", label: "Favoritos" },
  { to: "/cuenta/configuracion", label: "Configuración" },
];

function itemStyle(active: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "11px 14px",
    borderRadius: radius.sm,
    fontFamily: font.body,
    fontSize: 14,
    fontWeight: 600,
    color: active ? "#fff" : color.ink700,
    background: active ? color.primary : "transparent",
  };
}

export function AccountLayout() {
  const { user } = useAuth();
  return (
    <div style={{ background: color.surface, minHeight: "70vh", padding: "40px 0 80px" }}>
      <Container style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 30, alignItems: "start" }}>
        <aside style={{ background: "#fff", border: `1px solid ${color.border}`, borderRadius: 10, padding: 18, position: "sticky", top: 90 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 6px 16px", borderBottom: `1px solid ${color.border}`, marginBottom: 12 }}>
            <Avatar name={user?.full_name ?? "?"} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.ink900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>CLIENTE</div>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} style={({ isActive }) => itemStyle(isActive)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div>
          <Outlet />
        </div>
      </Container>
    </div>
  );
}
