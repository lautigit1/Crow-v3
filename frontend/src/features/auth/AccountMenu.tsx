import type * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Dropdown, MenuItem, Avatar, Button, Icon, type IconName } from "@/shared/ui";
import { color, font, radius } from "@/shared/config/theme";

type MenuLink = { to: string; label: string; icon: IconName };

const ADMIN_ITEMS: MenuLink[] = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
];

const USER_ITEMS: MenuLink[] = [
  { to: "/cuenta", label: "Mi perfil", icon: "users" },
  { to: "/cuenta/cotizaciones", label: "Mis cotizaciones", icon: "quotes" },
  { to: "/cuenta/pedidos", label: "Mis pedidos", icon: "box" },
  { to: "/cuenta/favoritos", label: "Favoritos", icon: "star" },
  { to: "/cuenta/configuracion", label: "Configuración", icon: "settings" },
];

const triggerBtn = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  height: 42,
  padding: "0 12px 0 10px",
  borderRadius: radius.sm,
  border: `1px solid ${active ? color.primary : color.border}`,
  background: "#fff",
  cursor: "pointer",
  fontFamily: font.body,
  fontWeight: 600,
  fontSize: 13.5,
  color: color.ink800,
});

function Divider() {
  return <div style={{ height: 1, background: color.border, margin: "6px 4px" }} />;
}

export function AccountMenu() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (close: () => void) => {
    close();
    logout();
    navigate("/");
  };

  // Guest
  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button as={Link} to="/login" variant="ghost" size="sm">
          Iniciar sesión
        </Button>
        <Button as={Link} to="/registro" size="sm">
          Crear cuenta
        </Button>
      </div>
    );
  }

  // Admin
  if (isAdmin) {
    return (
      <Dropdown
        width={230}
        trigger={(open) => (
          <button style={triggerBtn(open)}>
            <Avatar name={user.full_name} size={26} />
            Administración
            <span style={{ fontSize: 10, color: color.textFaint }}>▼</span>
          </button>
        )}
      >
        {(close) => (
          <>
            {ADMIN_ITEMS.map((it) => (
              <MenuItem key={it.to} as={Link} to={it.to} onClick={close}>
                <Icon name={it.icon} size={16} /> {it.label}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem danger onClick={() => handleLogout(close)}>
              <Icon name="logout" size={16} /> Cerrar sesión
            </MenuItem>
          </>
        )}
      </Dropdown>
    );
  }

  // Regular user
  return (
    <Dropdown
      width={220}
      trigger={(open) => (
        <button style={triggerBtn(open)}>
          <Avatar name={user.full_name} size={26} />
          Mi cuenta
          <span style={{ fontSize: 10, color: color.textFaint }}>▼</span>
        </button>
      )}
    >
      {(close) => (
        <>
          {USER_ITEMS.map((it) => (
            <MenuItem key={it.to} as={Link} to={it.to} onClick={close}>
              <Icon name={it.icon} size={16} /> {it.label}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem danger onClick={() => handleLogout(close)}>
            <Icon name="logout" size={16} /> Cerrar sesión
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}
