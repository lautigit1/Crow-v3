import { useState, type ElementType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Dropdown, Avatar, Button, Icon, type IconName } from "@/shared/ui";
import { color, font, radius } from "@/shared/config/theme";

type MenuLink = { to: string; label: string; icon: IconName; accent: string };

const USER_ITEMS: MenuLink[] = [
  { to: "/cuenta",               label: "Mi perfil",         icon: "users",    accent: "#3B82F6" },
  { to: "/cuenta/cotizaciones",  label: "Mis cotizaciones",  icon: "quotes",   accent: "#8B5CF6" },
  { to: "/cuenta/pedidos",       label: "Mis pedidos",       icon: "box",      accent: "#F59E0B" },
  { to: "/cuenta/favoritos",     label: "Favoritos",         icon: "star",     accent: "#EC4899" },
  { to: "/cuenta/configuracion", label: "Configuración",     icon: "settings", accent: "#64748B" },
];

const ADMIN_ITEMS: MenuLink[] = [
  { to: "/admin", label: "Dashboard", icon: "dashboard", accent: color.primary },
];

// ── Trigger button ────────────────────────────────────────────────────────────
function TriggerButton({ name, open, label }: { name: string; open: boolean; label: string }) {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 10px 0 6px",
        borderRadius: radius.md,
        border: `1.5px solid ${open ? color.primary : color.border}`,
        background: open ? color.primarySoft : "#fff",
        cursor: "pointer",
        transition: "all .15s",
        boxShadow: open ? `0 0 0 3px ${color.primary}18` : "none",
      }}
    >
      <Avatar name={name} size={28} />
      <span style={{
        fontFamily: font.body,
        fontWeight: 600,
        fontSize: 13.5,
        color: open ? color.primary : color.ink800,
        letterSpacing: "-.01em",
        maxWidth: 120,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <Icon
        name="chevronDown"
        size={14}
        style={{
          color: open ? color.primary : color.textFaint,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform .15s",
          marginLeft: 2,
        }}
      />
    </button>
  );
}

// ── Dropdown header (dark) ────────────────────────────────────────────────────
function DropdownHeader({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      background: color.ink900,
      borderRadius: `${radius.md} ${radius.md} 0 0`,
      padding: "16px 16px 14px",
      marginBottom: 6,
    }}>
      {/* Top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)`,
      }} />
      {/* Glow */}
      <div style={{
        position: "absolute", top: -40, right: -20, width: 140, height: 140,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,87,217,.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={name} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: font.display,
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-.01em",
            wordBreak: "break-word",
          }}>
            {name}
          </div>
          <div style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            color: "#7FB0FF",
            marginTop: 2,
            wordBreak: "break-all",
          }}>
            {email}
          </div>
        </div>
        <span style={{
          marginLeft: "auto",
          flexShrink: 0,
          fontFamily: font.mono,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: isAdmin ? "#FCD34D" : "#86EFAC",
          background: isAdmin ? "rgba(252,211,77,.12)" : "rgba(134,239,172,.12)",
          border: `1px solid ${isAdmin ? "rgba(252,211,77,.25)" : "rgba(134,239,172,.25)"}`,
          padding: "2px 7px",
          borderRadius: radius.pill,
        }}>
          {isAdmin ? "Admin" : "Cliente"}
        </span>
      </div>
    </div>
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────
function PremiumMenuItem({
  icon,
  label,
  accent,
  as: As = "button",
  to,
  onClick,
  danger,
}: {
  icon: IconName;
  label: string;
  accent?: string;
  as?: ElementType;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const fg = danger ? color.danger : accent ?? color.primary;

  return (
    <As
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 10px",
        border: "none",
        background: hov ? (danger ? "#FEF2F2" : color.primarySoft) : "transparent",
        borderRadius: radius.sm,
        cursor: "pointer",
        textDecoration: "none",
        transition: "background .12s",
      }}
    >
      <span style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hov ? `${fg}18` : color.surface,
        color: hov ? fg : color.textFaint,
        transition: "background .12s, color .12s",
        flexShrink: 0,
      }}>
        <Icon name={icon} size={14} />
      </span>
      <span style={{
        fontFamily: font.body,
        fontSize: 13.5,
        fontWeight: 500,
        color: danger ? color.danger : hov ? color.ink900 : color.text,
        letterSpacing: "-.01em",
      }}>
        {label}
      </span>
    </As>
  );
}

function Divider() {
  return <div style={{ height: 1, background: color.border, margin: "5px 6px" }} />;
}

// ── Main component ────────────────────────────────────────────────────────────
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

  const items = isAdmin ? ADMIN_ITEMS : USER_ITEMS;
  const label = user.full_name.split(" ")[0]; // primer nombre

  return (
    <Dropdown
      width={280}
      trigger={(open) => (
        <TriggerButton name={user.full_name} open={open} label={label} />
      )}
    >
      {(close) => (
        <div style={{ padding: "0 4px 4px" }}>
          <DropdownHeader
            name={user.full_name}
            email={user.email}
            isAdmin={isAdmin}
          />

          {items.map((it) => (
            <PremiumMenuItem
              key={it.to}
              icon={it.icon}
              label={it.label}
              accent={it.accent}
              as={Link}
              to={it.to}
              onClick={close}
            />
          ))}

          <Divider />

          <PremiumMenuItem
            icon="logout"
            label="Cerrar sesión"
            danger
            onClick={() => handleLogout(close)}
          />
        </div>
      )}
    </Dropdown>
  );
}
