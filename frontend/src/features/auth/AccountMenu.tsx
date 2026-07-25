import { useState, type ElementType } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "@/entities/session";
import { Dropdown, Avatar, Button, Icon, type IconName } from "@/shared/ui";
import { color } from "@/shared/config";

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
/**
 * Va a fondo completo (el `Dropdown` se monta con `flush`). Antes quedaba
 * enmarcada por el padding del panel, lo que además de leerse como una
 * tarjeta flotando dentro de otra le robaba ~20px de ancho útil -- suficiente
 * para que el nombre se partiera al medio ("Administrado / r").
 *
 * Los dos textos se truncan con puntos suspensivos en vez de quebrarse:
 * el nombre estaba en Unbounded, una display muy ancha pensada para títulos
 * de 30px y no para un dato de 13px en 280px de caja, y el mail en Fira Mono
 * con `break-all`, que corta donde llegue sin respetar la arroba ni el punto
 * ("admin@crowrepuesto / s.com"). Los dos pasan a DM Sans, que es la familia
 * con la que el resto de la interfaz muestra datos.
 */
function DropdownHeader({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  return (
    <div className="relative overflow-hidden bg-ink900 px-4 pb-4 pt-[18px]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
      <div className="pointer-events-none absolute -right-8 -top-12 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.14)_0%,transparent_70%)]" />

      <div className="relative flex items-center gap-3">
        <Avatar name={name} size={42} />

        {/* `min-w-0` es lo que habilita el truncado: sin eso el hijo flex
            adopta el ancho de su contenido y desborda en vez de recortarse. */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-body text-[14.5px] font-semibold leading-tight tracking-[-.01em] text-white">
              {name}
            </span>
            <span
              className={clsx(
                "shrink-0 rounded-pill border px-2 py-[2px] font-body text-[10px] font-bold uppercase tracking-[.06em]",
                isAdmin
                  ? "border-[rgba(252,211,77,.28)] bg-[rgba(252,211,77,.12)] text-[#FCD34D]"
                  : "border-[rgba(134,239,172,.28)] bg-[rgba(134,239,172,.12)] text-[#86EFAC]"
              )}
            >
              {isAdmin ? "Admin" : "Cliente"}
            </span>
          </div>
          {/* `title` para que el mail completo siga disponible en hover
              cuando no entra. */}
          <div className="mt-[3px] truncate font-body text-[12.5px] leading-tight text-[#8AA3BC]" title={email}>
            {email}
          </div>
        </div>
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
      className="flex w-full items-center gap-3 border-none rounded-md py-2.5 px-2.5 cursor-pointer no-underline transition-[background] duration-[120ms]"
      style={{ background: hov ? (danger ? "#FEF2F2" : color.primarySoft) : "transparent" }}
    >
      <span
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md transition-[background,color] duration-[120ms]"
        style={{ background: hov ? `${fg}18` : color.surface, color: hov ? fg : color.textFaint }}
      >
        <Icon name={icon} size={15} />
      </span>
      <span
        className="font-body text-[14px] font-medium tracking-[-0.01em]"
        style={{ color: danger ? color.danger : hov ? color.ink900 : color.text }}
      >
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
      width={296}
      flush
      trigger={(open) => (
        <TriggerButton name={user.full_name} open={open} label={label} />
      )}
    >
      {(close) => (
        <>
          <DropdownHeader
            name={user.full_name}
            email={user.email}
            isAdmin={isAdmin}
          />

          {/* El padding ahora lo pone esta sección y no el panel: la cabecera
              de arriba necesita llegar a los bordes, los ítems no. */}
          <div className="p-1.5">
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
        </>
      )}
    </Dropdown>
  );
}
