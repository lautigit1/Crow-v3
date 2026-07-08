import { useState, type ElementType } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
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
// Sin borde ni fondo propio, coloreado para vivir directo sobre la barra
// oscura de `Navbar` (único consumidor en el repo, ver
// openspec/changes/2026-07-07-navbar-redesign — el usuario pidió sacar la
// cápsula blanca de la derecha y dejar los accesos sueltos sobre `ink900`):
// texto claro en reposo, celeste `#7FB0FF` cuando está abierto -- mismo
// acento que ya usa el resto del sitio sobre `ink900` (StatsSection, Hero).
// `open` es un booleano plano, así que cada valor que controla tiene un par
// fijo de resultados, totalmente convertible a clases estáticas de Tailwind
// vía clsx.
function TriggerButton({ name, open, label }: { name: string; open: boolean; label: string }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-1.5 h-9 pl-1 pr-2.5 py-0 rounded-full border-none cursor-pointer transition-colors duration-150",
        open ? "bg-[rgba(255,255,255,.1)]" : "bg-transparent hover:bg-[rgba(255,255,255,.08)]"
      )}
    >
      <Avatar name={name} size={26} />
      <span
        className={clsx(
          "hidden lg:inline font-body font-semibold text-[13px] tracking-[-0.01em] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap",
          open ? "text-[#7FB0FF]" : "text-white/90"
        )}
      >
        {label}
      </span>
      <Icon
        name="chevronDown"
        size={13}
        className={clsx(
          "hidden lg:block transition-transform duration-150",
          open ? "rotate-180 text-[#7FB0FF]" : "text-[rgba(255,255,255,.5)]"
        )}
      />
    </button>
  );
}

// ── Dropdown header (dark) ────────────────────────────────────────────────────
function DropdownHeader({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  return (
    <div className="relative overflow-hidden bg-ink900 rounded-t-md pt-4 px-4 pb-3.5 mb-1.5">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
      {/* Glow */}
      <div className="absolute -top-10 -right-5 w-[140px] h-[140px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.18)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <Avatar name={name} size={40} />
        <div className="min-w-0">
          <div className="font-display text-[13px] font-bold text-white tracking-[-0.01em] break-words">
            {name}
          </div>
          <div className="font-mono text-[10.5px] text-[#7FB0FF] mt-0.5 break-all">{email}</div>
        </div>
        <span
          className={clsx(
            "ml-auto shrink-0 font-mono text-[9px] font-bold tracking-[0.1em] uppercase border py-0.5 px-[7px] rounded-pill",
            isAdmin
              ? "text-[#FCD34D] bg-[rgba(252,211,77,.12)] border-[rgba(252,211,77,.25)]"
              : "text-[#86EFAC] bg-[rgba(134,239,172,.12)] border-[rgba(134,239,172,.25)]"
          )}
        >
          {isAdmin ? "Admin" : "Cliente"}
        </span>
      </div>
    </div>
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────
// `accent` is a free hex-string prop (only ever called with a fixed set of
// values today, but typed to accept any string), and its hover tint is
// computed at runtime (`${fg}18`) -- Tailwind can't turn that into a static
// class, so this one keeps its `hov` state + inline style on purpose.
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
  return <div className="h-px bg-border my-[5px] mx-1.5" />;
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

  // Guest -- estilado a mano en vez de reusar la variante "ghost" de
  // `Button` (fondo transparente + texto oscuro): eso asumía vivir sobre
  // un fondo claro, y hoy este componente cuelga directo de la barra
  // oscura de `Navbar` (único consumidor en el repo). "Crear cuenta" sí
  // reusa `Button` primary tal cual -- su fondo azul sólido funciona
  // igual sobre cualquier fondo.
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link
          to="/login"
          className="flex h-9 items-center rounded-full px-3 font-body text-[13px] font-semibold text-[rgba(255,255,255,.75)] no-underline transition-colors duration-150 hover:text-white"
        >
          Iniciar sesión
        </Link>
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
        <div className="pt-0 px-1 pb-1">
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
