import { Link } from "react-router-dom";
import Hoverable from "../lib/Hoverable";
import Logo from "./Logo";
import { useScrolled } from "../lib/useScrolled";
import { waLink } from "../lib/whatsapp";

export type NavLink = {
  label: string;
  href: string;
  /** Render as a react-router <Link> (internal route) instead of <a>. */
  route?: boolean;
  /** Highlighted as the current section. */
  active?: boolean;
};

type SiteHeaderProps = {
  links: NavLink[];
  onQuote: () => void;
  maxWidth?: number;
};

/** Sticky top navigation shared by every page. */
export default function SiteHeader({ links, onQuote, maxWidth = 1280 }: SiteHeaderProps) {
  const scrolled = useScrolled();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#fff",
        borderBottom: "1px solid #E6EAEF",
        boxShadow: scrolled ? "0 8px 30px rgba(10,22,34,.10)" : "none",
        transition: "box-shadow .25s ease",
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "0 40px",
          height: 74,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <Logo />

        <nav style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {links.map((link) => {
            const style = {
              font: "600 14px/1 'IBM Plex Sans',sans-serif",
              color: link.active ? "#0066FF" : "#2B3744",
              letterSpacing: ".01em",
              position: "relative" as const,
            };
            const underline = link.active ? (
              <span style={{ position: "absolute", left: 0, right: 0, bottom: -26, height: 2, background: "#0066FF" }} />
            ) : null;
            return link.route ? (
              <Link key={link.label} to={link.href} style={style}>
                {link.label}
                {underline}
              </Link>
            ) : (
              <a key={link.label} href={link.href} style={style}>
                {link.label}
                {underline}
              </a>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Hoverable
            as="a"
            href={waLink("Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.")}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              height: 42,
              padding: "0 18px",
              border: "1px solid #D7DDE4",
              borderRadius: 2,
              font: "600 13.5px/1 'IBM Plex Sans',sans-serif",
              color: "#1B2735",
            }}
            hoverStyle={{ borderColor: "#1FAE54", color: "#117a3a" }}
          >
            <span style={{ width: 8, height: 8, background: "#25D366", borderRadius: "50%", display: "inline-block" }} />
            WhatsApp
          </Hoverable>
          <Hoverable
            as="button"
            onClick={onQuote}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 22px",
              background: "#0066FF",
              color: "#fff",
              border: "none",
              borderRadius: 2,
              font: "700 13.5px/1 'IBM Plex Sans',sans-serif",
              letterSpacing: ".01em",
              cursor: "pointer",
            }}
            hoverStyle={{ background: "#0a57d0" }}
          >
            Solicitar cotización
          </Hoverable>
        </div>
      </div>
    </header>
  );
}
