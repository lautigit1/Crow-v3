import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Container, Logo, Icon, Avatar, Button } from "@/shared/ui";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { CartPreview } from "@/features/cart/CartPreview";
import { useAuth } from "@/entities/session";
import { useCart } from "@/app/providers/CartProvider";
import { useScrolled } from "@/shared/lib/useScrolled";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { useIsOpenNow } from "@/shared/lib/useIsOpenNow";
import { CATEGORIES } from "@/shared/config";
import { useWaLink } from "@/entities/settings/useSiteSettings";

const LINKS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/marcas", label: "Marcas" },
  { to: "/contacto", label: "Contacto" },
];

// ── Status chip ───────────────────────────────────────────────────────────────
// Dato real, no decorativo: calculado vía useIsOpenNow() (ver ese archivo --
// usa un horario fijo lun-sáb 8-18, no el texto libre de Configuración).
// Sin borde/fondo propio a propósito (ver feedback de usuario en tasks.md,
// N7): un punto + texto flotando junto al logo, no una "caja" más en la
// barra.
function StatusChip({ className }: { className?: string }) {
  const open = useIsOpenNow();
  return (
    <span className={clsx("items-center gap-1.5", className)}>
      <span className="relative flex h-[6px] w-[6px] shrink-0">
        <span
          className={clsx(
            "absolute inset-0 rounded-full",
            open ? "bg-[#4ADE80] animate-[pulse-glow_2s_ease-in-out_infinite]" : "bg-[rgba(255,255,255,.3)]"
          )}
        />
      </span>
      <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-[rgba(255,255,255,.45)] whitespace-nowrap">
        {open ? "Abierto ahora" : "Cerrado"}
      </span>
    </span>
  );
}

// ── Nav cluster (desktop) ─────────────────────────────────────────────────────
// "Hablanos" (WhatsApp) vivió acá un momento, pero el usuario notó que
// quedaba redundante con "Escribir por WhatsApp" del Hero -- misma acción,
// visible dos veces a centímetros de distancia. Se saca de acá (el Hero ya
// la cubre en Home; en el resto del sitio, `MoreSheet` en mobile y las
// páginas de contacto/cotización siguen ofreciendo WhatsApp donde
// corresponde). El cluster vuelve a ser solo los 4 links de navegación,
// con el subrayado que se desliza al hover (mismo gesto que "Ver catálogo"
// usaba en Hero/CategoryGrid).
function NavCluster() {
  const location = useLocation();
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [bar, setBar] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false });
  const [hovered, setHovered] = useState<string | null>(null);

  const activeTo = LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)))?.to ?? LINKS[0].to;
  const targetTo = hovered ?? activeTo;

  const measure = useCallback(() => {
    const el = itemRefs.current.get(targetTo);
    const rail = railRef.current;
    if (el && rail) {
      const elRect = el.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      setBar({ left: elRect.left - railRect.left, width: elRect.width, ready: true });
    }
  }, [targetTo]);

  useEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <nav
      ref={railRef}
      onMouseLeave={() => setHovered(null)}
      className="relative flex items-center gap-1 rounded-full border border-[rgba(255,255,255,.08)] bg-[rgba(255,255,255,.03)] p-1.5"
    >
      {bar.ready && (
        <motion.span
          className="absolute bottom-[3px] h-[2px] rounded-full bg-[linear-gradient(90deg,#0057D9,#7FB0FF)]"
          animate={{ left: bar.left + 12, width: bar.width - 24 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          ref={(el) => {
            if (el) itemRefs.current.set(l.to, el);
          }}
          onMouseEnter={() => setHovered(l.to)}
          className={({ isActive }) =>
            clsx(
              "relative z-10 rounded-full px-3.5 py-[7px] font-body text-[13px] font-semibold whitespace-nowrap no-underline outline-none [transition:color_.16s] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF]",
              isActive ? "text-white" : "text-[rgba(255,255,255,.55)] hover:text-white"
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

// ── Search palette — command-palette style, atajo "/" ────────────────────────────
function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/catalogo?q=${encodeURIComponent(query.trim())}` : "/catalogo");
    onClose();
  };

  const goCategory = (label: string) => {
    navigate(`/catalogo?cat=${encodeURIComponent(label)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex justify-center px-4 pt-[10vh] sm:pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(7,17,31,.72)] [backdrop-filter:blur(4px)]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar en el catálogo"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative h-fit w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-lg"
          >
            <form onSubmit={submit} className="flex h-14 items-center gap-3 border-b border-border px-5">
              <Icon name="search" size={17} className="shrink-0 text-textFaint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por producto, SKU o marca…"
                className="h-full flex-1 bg-transparent font-body text-[15px] text-text outline-none placeholder:text-textFaint"
              />
              <kbd className="hidden shrink-0 rounded border border-border bg-surface px-[6px] py-0.5 font-mono text-[10px] text-textFaint sm:inline-block">
                ESC
              </kbd>
            </form>

            <div className="p-4">
              <div className="mb-2.5 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-textFaint">
                Categorías
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => goCategory(c.label)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-2.5 pr-3 outline-none [transition:border-color_.14s,background-color_.14s] hover:border-primary hover:bg-primarySoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Icon name={c.icon} size={13} className="text-primary" />
                    <span className="font-body text-[12.5px] font-semibold text-ink800">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Action row (desktop) ─────────────────────────────────────────────────────
// "Hablanos" se mudó a `NavCluster` (ver arriba) -- acá queda solo lo que
// es genuinamente independiente de la navegación: buscar, carrito, cuenta.
// Sin caja/borde que los agrupe, cada uno con su propio hover sutil.
//
// El botón de buscar necesita `bg-transparent` explícito: Preflight está
// apagado en este proyecto (tailwind.config.ts), así que un `<button>` sin
// fondo propio muestra el fondo por defecto del navegador (gris/blanco) en
// vez de quedar transparente -- el mismo motivo por el que la navbar vieja
// ya ponía `bg-transparent` a mano en sus botones (hamburguesa, cerrar).
function ActionRow({ onSearchOpen }: { onSearchOpen: () => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onSearchOpen}
        aria-label="Buscar (atajo: /)"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[rgba(255,255,255,.7)] outline-none [transition:background-color_.14s,color_.14s] hover:bg-[rgba(255,255,255,.08)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF]"
      >
        <Icon name="search" size={16} />
      </button>

      <CartPreview />

      <AccountMenu />
    </div>
  );
}

// ── Mobile dock ───────────────────────────────────────────────────────────────
function DockLink({ to, end, label, icon, badge }: { to: string; end?: boolean; label: string; icon: "home" | "products" | "cart"; badge?: number }) {
  const location = useLocation();
  const active = end ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={clsx(
        "relative flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-full no-underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF]",
        active ? "text-white" : "text-[rgba(255,255,255,.5)]"
      )}
    >
      <span className="relative">
        <Icon name={icon} size={19} />
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-ink900 bg-primary px-[3px] font-mono text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="font-body text-[9.5px] font-semibold leading-none">{label}</span>
      {active && <span className="absolute -bottom-0.5 h-[3px] w-[3px] rounded-full bg-primary" />}
    </Link>
  );
}

function MobileDock({ onSearch, onMore }: { onSearch: () => void; onMore: () => void }) {
  const { count } = useCart();
  return (
    <div className="fixed inset-x-0 bottom-0 z-[150] flex justify-center px-4 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[rgba(255,255,255,.08)] bg-ink900 px-2 py-2 shadow-[0_16px_40px_rgba(7,17,31,.4)]">
        <DockLink to="/" end label="Inicio" icon="home" />
        <DockLink to="/catalogo" label="Catálogo" icon="products" />

        <button
          onClick={onSearch}
          aria-label="Buscar"
          className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-ink900 bg-primary text-white shadow-[0_10px_24px_rgba(0,87,217,.5)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Icon name="search" size={20} />
        </button>

        <DockLink to="/carrito" label="Carrito" icon="cart" badge={count} />

        <button
          onClick={onMore}
          aria-label="Más opciones"
          className="flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-full bg-transparent text-[rgba(255,255,255,.5)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF]"
        >
          <Icon name="more" size={19} />
          <span className="font-body text-[9.5px] font-semibold leading-none">Menú</span>
        </button>
      </div>
    </div>
  );
}

// ── More sheet (mobile) — Marcas / Contacto / cuenta ─────────────────────────────
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);
  const waLink = useWaLink();

  // Foco/Escape/trap -- hallazgo de accesibilidad de la auditoría técnica
  // del 2026-07-13. Antes esta hoja no tenía ninguna semántica de diálogo:
  // el foco del teclado se quedaba en el botón "Menú" de atrás al abrir,
  // Escape no la cerraba, y Tab podía escaparse hacia el contenido de la
  // página debajo del overlay. Ahora se comporta como un diálogo modal
  // real: el foco entra al panel al abrir, Escape cierra, Tab/Shift+Tab
  // quedan atrapados adentro mientras está abierta, y el foco vuelve al
  // botón "Menú" que la abrió al cerrarse.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleLogout = () => {
    onClose();
    logout();
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col justify-end">
      <div onClick={onClose} aria-hidden="true" className="absolute inset-0 bg-[rgba(7,17,31,.55)] [backdrop-filter:blur(2px)]" />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Más opciones"
        tabIndex={-1}
        className="relative animate-[slideUp_.22s_ease_both] rounded-t-2xl bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        <div className="mb-4 flex flex-col">
          <Link to="/marcas" onClick={onClose} className="flex items-center justify-between border-b border-border py-3.5 no-underline">
            <span className="font-body text-[14.5px] font-semibold text-ink900">Marcas</span>
            <Icon name="chevronRight" size={16} className="text-textFaint" />
          </Link>
          <Link to="/contacto" onClick={onClose} className="flex items-center justify-between border-b border-border py-3.5 no-underline">
            <span className="font-body text-[14.5px] font-semibold text-ink900">Contacto</span>
            <Icon name="chevronRight" size={16} className="text-textFaint" />
          </Link>
          <a
            href={waLink("Hola Crow! Quiero consultar por un repuesto.")}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center justify-between py-3.5 no-underline"
          >
            <span className="font-body text-[14.5px] font-semibold text-[#0C7C3F]">Escribinos por WhatsApp</span>
            <Icon name="message" size={16} className="text-[#0C7C3F]" />
          </a>
        </div>

        {user ? (
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Avatar name={user.full_name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-body text-[13.5px] font-semibold text-ink900">{user.full_name}</div>
              <Link to={isAdmin ? "/admin" : "/cuenta"} onClick={onClose} className="font-body text-[12px] font-semibold text-primary no-underline">
                Ver mi cuenta
              </Link>
            </div>
            <button onClick={handleLogout} className="border-none bg-transparent font-body text-[12.5px] font-semibold text-danger">
              Salir
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 border-t border-border pt-4">
            <Button as={Link} to="/login" variant="outline" size="sm" fullWidth onClick={onClose}>
              Iniciar sesión
            </Button>
            <Button as={Link} to="/registro" size="sm" fullWidth onClick={onClose}>
              Crear cuenta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scroll progress — línea sutil en el borde inferior de la barra ──────────────
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar() {
  const scrolled = useScrolled();
  const progress = useScrollProgress();
  // `isMobile` sigue siendo un booleano de JS (no un breakpoint `md:`) a
  // propósito: las dos ramas montan subárboles interactivos
  // estructuralmente distintos (dock+hoja vs. rail+cápsula) -- renderizar
  // ambos y ocultar uno con CSS duplicaría elementos accesibles/con
  // estado en el DOM.
  const { isMobile } = useBreakpoint();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Atajo global "/", ignorado si el foco ya está en un campo de texto.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || searchOpen) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-[100] border-b border-[rgba(255,255,255,.08)] bg-ink900 [transition:box-shadow_.25s]",
          scrolled ? "shadow-[0_6px_24px_rgba(7,17,31,.35)]" : "shadow-none"
        )}
      >
        <Container className="flex h-16 items-center">
          {isMobile ? (
            /* ── Mobile top strip: mínima a propósito, la navegación vive en el dock ── */
            <div className="flex w-full items-center gap-2.5">
              <Logo variant="dark" size="sm" />
              <StatusChip className="ml-auto flex" />
            </div>
          ) : (
            /* ── Desktop: una sola superficie oscura, sin cajas sueltas ── */
            <>
              <div className="mr-6 flex shrink-0 items-center gap-2.5">
                <Logo variant="dark" size="sm" />
                <StatusChip className="hidden lg:flex" />
              </div>

              <NavCluster />

              <div className="flex-1" />

              <ActionRow onSearchOpen={() => setSearchOpen(true)} />
            </>
          )}
        </Container>

        {/* Progreso de scroll — barra que "carga" a medida que se avanza por la página */}
        <div
          className="h-[2px] bg-[linear-gradient(90deg,#0057D9,#7FB0FF)] [transition:width_.15s_linear]"
          style={{ width: `${progress * 100}%` }}
        />
      </header>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      {isMobile && (
        <>
          <MobileDock onSearch={() => setSearchOpen(true)} onMore={() => setMoreOpen(true)} />
          <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      )}
    </>
  );
}
