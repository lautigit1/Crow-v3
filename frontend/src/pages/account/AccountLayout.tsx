import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { Container, Avatar, Icon, type IconName } from "@/shared/ui";
import { useAuth } from "@/entities/session";

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

const LINKS: NavItem[] = [
  { to: "/cuenta", label: "Mi perfil", icon: "users", end: true },
  { to: "/cuenta/cotizaciones", label: "Mis cotizaciones", icon: "quotes" },
  { to: "/cuenta/pedidos", label: "Mis pedidos", icon: "box" },
  { to: "/cuenta/favoritos", label: "Favoritos", icon: "star" },
  { to: "/cuenta/configuracion", label: "Configuración", icon: "settings" },
];

// `hov` used to be tracked in JS purely to interpolate a 3-way color/bg
// (active / hover / rest) -- both the link and its icon chip now use
// `group`/`hover:`/`group-hover:` natively. `isActive` still comes from
// NavLink's render prop. The two alpha-blended icon-chip tints
// (`${color.primary}18` / `${color.primary}0D`) are fixed compile-time
// constants, so they're literal Tailwind classes, not interpolated ones.
function SidebarLink({ to, label, icon, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-2.5 py-2.5 px-3.5 rounded-sm font-body text-[13.5px] no-underline border-l-[3px] -ml-px transition-colors duration-[120ms]",
          isActive
            ? "font-bold text-primary bg-primarySoft border-primary"
            : "font-medium text-textMuted bg-transparent border-transparent hover:text-ink900 hover:bg-surface"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              "w-[30px] h-[30px] rounded-md shrink-0 flex items-center justify-center transition-colors duration-[120ms]",
              isActive ? "bg-[#0057D918] text-primary" : "bg-surface text-textFaint group-hover:bg-[#0057D90D] group-hover:text-ink700"
            )}
          >
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
    <div className="bg-[#F1F5F9] min-h-[70vh] pt-10 pb-20">
      <Container className="grid grid-cols-[268px_1fr] gap-7 items-start">

        {/* ── Sidebar ── */}
        <aside className="border border-border rounded-[14px] overflow-hidden sticky top-[90px] shadow-[0_4px_24px_rgba(7,17,31,.06)]">
          {/* Dark header */}
          <div className="relative overflow-hidden bg-ink900 pt-[22px] px-5 pb-5">
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
            {/* Glow */}
            <div className="absolute -top-[50px] -right-5 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.2)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative flex flex-col items-center gap-3 text-center">
              <Avatar name={user?.full_name ?? "?"} size={58} />
              <div>
                <div className="font-display text-[15px] font-extrabold text-white tracking-[-.02em] leading-[1.2]">
                  {user?.full_name}
                </div>
                <div className="font-mono text-[10.5px] text-[#7FB0FF] mt-[5px] break-all">
                  {user?.email}
                </div>
              </div>
              <span
                className={clsx(
                  "font-mono text-[9px] font-bold tracking-[.12em] uppercase py-[3px] px-2.5 rounded-full border",
                  isAdmin
                    ? "text-[#FCD34D] bg-[rgba(252,211,77,.12)] border-[rgba(252,211,77,.28)]"
                    : "text-[#86EFAC] bg-[rgba(134,239,172,.12)] border-[rgba(134,239,172,.28)]"
                )}
              >
                {isAdmin ? "Administrador" : "Cliente"}
              </span>
            </div>
          </div>

          {/* Nav */}
          <div className="bg-white pt-2.5 px-3 pb-3.5">
            <div className="font-mono text-[9px] tracking-[.12em] uppercase text-textFaint pt-2 pr-1 pb-1.5 pl-[17px]">
              Mi cuenta
            </div>
            <nav className="flex flex-col gap-0.5">
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
