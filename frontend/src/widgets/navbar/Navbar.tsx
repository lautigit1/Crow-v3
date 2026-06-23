import { useState, type FormEvent, type CSSProperties } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Container, Logo, Icon } from "@/shared/ui";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { useScrolled } from "@/shared/lib/useScrolled";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { color, font, radius, shadow } from "@/shared/config/theme";

const LINKS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/marcas", label: "Marcas" },
  { to: "/contacto", label: "Contacto" },
];

function NavItem({ to, label, end, onClick }: { to: string; label: string; end?: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <NavLink to={to} end={end} style={{ textDecoration: "none" }} onClick={onClick}>
      {({ isActive }) => (
        <span
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "5px 10px", borderRadius: 8,
            fontFamily: font.body, fontWeight: 600, fontSize: 14,
            color: isActive ? color.primary : hovered ? color.ink900 : color.ink700,
            background: isActive ? color.primarySoft : hovered ? color.surface : "transparent",
            transition: "color .16s, background .16s",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {label}
          {isActive && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.primary, display: "inline-block", marginLeft: 2 }} />
          )}
        </span>
      )}
    </NavLink>
  );
}

function SearchBar({ onSearch: onSearchCb }: { onSearch?: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/catalogo?q=${encodeURIComponent(query.trim())}` : "/catalogo");
    onSearchCb?.();
  };

  const inputStyle: CSSProperties = {
    width: "100%", height: 40, padding: "0 96px 0 40px",
    border: `1.5px solid ${focused ? color.primary : color.border}`,
    borderRadius: 999, background: focused ? "#fff" : color.surface,
    fontFamily: font.body, fontSize: 13.5, color: color.text,
    outline: "none", transition: "border-color .18s, background .18s, box-shadow .18s",
    boxShadow: focused ? `0 0 0 3px rgba(0,87,217,.1)` : "none",
  };

  return (
    <form onSubmit={onSearch} style={{ flex: 1, maxWidth: 380, position: "relative" }}>
      <span style={{
        position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
        color: focused ? color.primary : color.textFaint,
        display: "flex", alignItems: "center", pointerEvents: "none", transition: "color .18s",
      }}>
        <Icon name="search" size={15} strokeWidth={2} />
      </span>
      <input
        value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar repuesto, SKU o marca…"
        style={inputStyle}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      {!focused && !query && (
        <span style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", pointerEvents: "none",
        }}>
          <kbd style={{
            fontFamily: font.mono, fontSize: 10, color: color.textFaint,
            background: "#fff", border: `1px solid ${color.border}`,
            borderRadius: 4, padding: "2px 5px", lineHeight: 1.4,
          }}>/</kbd>
        </span>
      )}
    </form>
  );
}

// ── Mobile menu overlay ───────────────────────────────────────────────────────
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/catalogo?q=${encodeURIComponent(query.trim())}` : "/catalogo");
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,.55)", backdropFilter: "blur(4px)" }}
      />

      {/* Drawer */}
      <div style={{
        position: "relative",
        background: "#fff",
        boxShadow: shadow.lg,
        padding: "16px 0 24px",
        animation: "slideDown .22s ease both",
      }}>
        {/* Header row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px 16px",
          borderBottom: `1px solid ${color.border}`,
        }}>
          <Logo />
          <button
            onClick={onClose}
            style={{
              background: color.surface, border: `1px solid ${color.border}`,
              borderRadius: radius.md, width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: color.textMuted,
            }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 20px" }}>
          <form onSubmit={onSearch} style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
              color: color.textFaint, display: "flex", alignItems: "center", pointerEvents: "none",
            }}>
              <Icon name="search" size={15} />
            </span>
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar repuesto o marca…"
              style={{
                width: "100%", boxSizing: "border-box",
                height: 44, padding: "0 14px 0 40px",
                border: `1.5px solid ${color.border}`, borderRadius: radius.md,
                fontFamily: font.body, fontSize: 14, color: color.text,
                background: color.surface, outline: "none",
              }}
              onFocus={(e) => { e.target.style.borderColor = color.primary; }}
              onBlur={(e) => { e.target.style.borderColor = color.border; }}
            />
          </form>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", padding: "0 12px" }}>
          {LINKS.map((l) => (
            <NavItem key={l.to} to={l.to} label={l.label} end={l.end} onClick={onClose} />
          ))}
        </nav>

        {/* Account */}
        <div style={{ padding: "16px 20px 0", borderTop: `1px solid ${color.border}`, marginTop: 8 }}>
          <AccountMenu />
        </div>
      </div>

      <style>{`@keyframes slideDown { from { transform: translateY(-12px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar() {
  const scrolled = useScrolled();
  const { isMobile } = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,.97)" : "rgba(255,255,255,.88)",
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
        borderBottom: `1px solid ${scrolled ? color.border : "rgba(226,232,240,.6)"}`,
        boxShadow: scrolled ? shadow.nav : "none",
        transition: "background .25s, box-shadow .25s, border-color .25s",
      }}>
        {scrolled && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 50%, ${color.primary} 100%)`,
            opacity: 0.7,
          }} />
        )}

        <Container style={{
          height: scrolled ? 60 : 70,
          display: "flex", alignItems: "center", gap: 6,
          transition: "height .2s",
        }}>
          <div style={{ flexShrink: 0, marginRight: 10 }}>
            <Logo />
          </div>

          {isMobile ? (
            /* ── Mobile ── */
            <>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setMenuOpen(true)}
                style={{
                  background: "none", border: `1px solid ${color.border}`,
                  borderRadius: radius.md, width: 38, height: 38,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: color.ink700,
                }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </>
          ) : (
            /* ── Desktop ── */
            <>
              <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {LINKS.map((l) => <NavItem key={l.to} to={l.to} label={l.label} end={l.end} />)}
              </nav>
              <div style={{ width: 1, height: 22, background: color.border, margin: "0 10px", flexShrink: 0 }} />
              <SearchBar />
              <div style={{ marginLeft: 10, flexShrink: 0 }}>
                <AccountMenu />
              </div>
            </>
          )}
        </Container>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
