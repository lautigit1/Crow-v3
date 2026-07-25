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
          "group flex items-center gap-3 py-2.5 px-3.5 rounded-md font-body text-[14px] no-underline border-l-[3px] -ml-px transition-colors duration-[120ms]",
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
      {/* `lg:` en vez de un grid de dos columnas fijo: sin breakpoint, en un
          teléfono la barra lateral seguía reservando 268px y el contenido
          quedaba en la nada. Ahora se apila y el sticky se activa recién
          cuando hay dos columnas de verdad. */}
      <Container className="grid items-start gap-6 lg:grid-cols-[264px_1fr] lg:gap-7">

        {/* ── Sidebar ──
            La identidad estaba dos veces en pantalla: acá en grande (avatar
            58px, nombre, mail, chip de rol) y otra vez en el encabezado de
            cada página. Dos bloques oscuros compitiendo por decir lo mismo.
            Acá queda la versión compacta -- suficiente para saber con qué
            cuenta estás -- y el dato completo vive en el encabezado. */}
        <aside className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[0_4px_24px_rgba(7,17,31,.06)] lg:sticky lg:top-[90px]">
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            <Avatar name={user?.full_name ?? "?"} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-body text-[14px] font-semibold leading-tight tracking-[-.01em] text-ink900">
                {user?.full_name}
              </div>
              {/* El mail estaba en Fira Mono 10.5px con `break-all`, que corta
                  donde llegue sin respetar la arroba. Truncado con `title`
                  para verlo entero en hover. */}
              <div className="mt-0.5 truncate font-body text-[12.5px] leading-tight text-textFaint" title={user?.email}>
                {user?.email}
              </div>
            </div>
            <span
              className={clsx(
                "shrink-0 rounded-pill border px-2 py-[2px] font-body text-[10px] font-bold uppercase tracking-[.06em]",
                isAdmin
                  ? "border-[#FDE68A] bg-warningSoft text-warning"
                  : "border-[#BBF7D0] bg-successSoft text-success"
              )}
            >
              {isAdmin ? "Admin" : "Cliente"}
            </span>
          </div>

          {/* Nav */}
          <div className="px-3 pb-3.5 pt-3">
            <div className="mb-1.5 pl-[17px] font-body text-[11.5px] font-semibold leading-none text-textFaint">
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
