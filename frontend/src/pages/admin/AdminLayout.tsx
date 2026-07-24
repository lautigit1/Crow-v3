import { useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import clsx from "clsx";
import { AnimatedOutlet } from "@/shared/ui/AnimatedOutlet";
import { Logo, Icon, type IconName } from "@/shared/ui";
import { useAuth } from "@/entities/session";

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
      { to: "/admin/estadisticas", label: "Estadísticas", icon: "trendingUp" },
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

// The `hov` state + onMouseEnter/Leave used to exist purely to swap static
// colors on hover (and the icon needed a *different* hover color than the
// label) -- both are native `hover:`/`group-hover:` now, no JS needed.
// `isActive` still comes from NavLink's render prop (router state).
function SidebarItem({ it }: { it: Item }) {
  return (
    <NavLink
      to={it.to}
      end={it.end}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-2.5 py-[9px] px-[11px] rounded-md font-body text-[13.5px] font-semibold no-underline border-l-2 [transition:background-color_.14s,color_.14s,border-color_.14s]",
          isActive
            ? "text-white bg-[rgba(0,87,217,.22)] border-primary"
            : "text-[#5C7A8F] bg-transparent border-transparent hover:bg-[rgba(255,255,255,.05)] hover:text-[#C4D4E0]"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              "shrink-0 transition-colors duration-[140ms]",
              isActive ? "text-[#7FB0FF]" : "text-[#3D5C72] group-hover:text-[#8BA8BF]"
            )}
          >
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

  // Las páginas públicas actualizan <title> vía usePageMeta(), pero ninguna
  // página del admin lo hacía -- la pestaña del navegador se quedaba
  // pegada en lo último que se hubiera seteado antes de entrar acá (típico:
  // "Iniciar sesión"), sin importar en qué sección del admin estuvieras.
  // No se usa usePageMeta() completo acá a propósito: ese hook también
  // toca meta description/OG/canonical, pensados para páginas públicas
  // indexables -- el admin no necesita nada de eso, solo el título de la
  // pestaña.
  useEffect(() => {
    document.title = `${breadcrumb} · Admin · Crow Repuestos`;
  }, [breadcrumb]);

  const initials = (user?.full_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = user ? (user.full_name.charCodeAt(0) * 17) % 360 : 210;

  return (
    <div className="grid grid-cols-[260px_1fr] min-h-screen bg-[#F1F5F9]">

      {/* ── Sidebar ── */}
      <aside className="bg-ink900 flex flex-col sticky top-0 h-screen overflow-y-auto border-r border-[rgba(255,255,255,.04)]">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.1)_0%,transparent_70%)] pointer-events-none" />

        {/* Logo */}
        <div className="pt-5 px-[18px] pb-4 border-b border-[rgba(255,255,255,.05)]">
          <Logo variant="dark" size="sm" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3.5 px-2.5 flex flex-col gap-[22px] overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="font-mono text-[9.5px] font-bold tracking-[.18em] text-[#253545] uppercase px-[11px] pb-2">
                {g.title}
              </div>
              <div className="flex flex-col gap-px">
                {g.items.map((it) => <SidebarItem key={it.to} it={it} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — user card + actions */}
        <div className="pt-2.5 px-2.5 pb-3.5 border-t border-[rgba(255,255,255,.06)]">
          {/* View site */}
          <Link
            to="/"
            className="flex items-center gap-2.5 py-2 px-[11px] rounded-md font-body text-[13px] font-semibold text-[#3D5C72] no-underline [transition:color_.14s,background-color_.14s] hover:text-[#8BA8BF] hover:bg-[rgba(255,255,255,.04)]"
          >
            <Icon name="external" size={15} /> Ver sitio
          </Link>

          {/* User mini-card */}
          <div className="mt-2 bg-[rgba(255,255,255,.04)] border border-[rgba(255,255,255,.06)] rounded-md p-3 flex items-center gap-[11px]">
            {/* `hue` is computed per-user at runtime -- genuinely dynamic, stays inline. */}
            <div
              className="w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center font-display text-[13px] font-extrabold text-white"
              style={{ background: `hsl(${hue},55%,36%)` }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-body text-[13px] font-semibold text-[#C4D4E0] whitespace-nowrap overflow-hidden text-ellipsis">{user?.full_name}</div>
              <div className="font-mono text-[9.5px] text-primary tracking-[.08em]">ADMIN</div>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              title="Cerrar sesión"
              className="bg-transparent border-none cursor-pointer text-[#2A3F52] p-1 flex items-center transition-colors duration-[140ms] hover:text-[#FCA5A5]"
            >
              <Icon name="logout" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-[60px] bg-[rgba(255,255,255,.95)] [backdrop-filter:saturate(180%)_blur(10px)] [-webkit-backdrop-filter:saturate(180%)_blur(10px)] border-b border-border shadow-[0_1px_0_rgba(0,0,0,.03)] flex items-center justify-between px-7 sticky top-0 z-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-textFaint tracking-[.08em]">ADMIN</span>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="stroke-border" strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            <span className="font-mono text-[11px] font-bold text-ink900 tracking-[.06em] uppercase">{breadcrumb}</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <div className="font-body text-[13.5px] font-semibold text-ink800 leading-[1.2]">{user?.full_name}</div>
              <div className="font-mono text-[10px] text-primary tracking-[.08em]">ADMINISTRADOR</div>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-display text-[13px] font-extrabold text-white"
              style={{ background: `hsl(${hue},55%,46%)` }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-7 px-8 pb-12 flex-1 min-w-0">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}
