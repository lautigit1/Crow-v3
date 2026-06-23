import { Link } from "react-router-dom";
import Hoverable from "../lib/Hoverable";
import Logo from "./Logo";
import { EMAIL, HOURS, PHONE_DISPLAY, PHONE_TEL, waLink } from "../lib/whatsapp";

type FooterProps = {
  /** When true, section links point to same-page anchors (#id); otherwise to /#id. */
  onHome?: boolean;
  maxWidth?: number;
};

const linkStyle = { font: "500 14px/1 'IBM Plex Sans',sans-serif", color: "#AEBECD" } as const;
const labelStyle = { font: "500 11px/1 'IBM Plex Mono',monospace", letterSpacing: ".12em", color: "#5E6F80", marginBottom: 18 } as const;

export default function Footer({ onHome = false, maxWidth = 1280 }: FooterProps) {
  const hash = (id: string) => (onHome ? `#${id}` : `/#${id}`);

  const FootLink = ({ children, href, route }: { children: string; href: string; route?: boolean }) =>
    route ? (
      <Hoverable as={Link} to={href} style={linkStyle} hoverStyle={{ color: "#fff" }}>
        {children}
      </Hoverable>
    ) : (
      <Hoverable as="a" href={href} style={linkStyle} hoverStyle={{ color: "#fff" }}>
        {children}
      </Hoverable>
    );

  return (
    <footer style={{ background: "#070F18", padding: "70px 0 32px" }}>
      <div style={{ maxWidth, margin: "0 auto", padding: "0 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            gap: 40,
            paddingBottom: 48,
            borderBottom: "1px solid rgba(255,255,255,.1)",
          }}
        >
          <div>
            <div style={{ marginBottom: 20 }}>
              <Logo size="footer" innerColor="#070F18" />
            </div>
            <p style={{ font: "400 14px/1.6 'IBM Plex Sans',sans-serif", color: "#7E90A2", maxWidth: 300 }}>
              Distribuidora de repuestos, lubricantes y productos de detailing para autos, camiones y motos. Stock real y
              asesoría técnica.
            </p>
          </div>

          <div>
            <div style={labelStyle}>CATEGORÍAS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FootLink href="/catalogo?cat=Autos" route>Repuestos Autos</FootLink>
              <FootLink href="/catalogo?cat=Camiones" route>Repuestos Camiones</FootLink>
              <FootLink href="/catalogo?cat=Motos" route>Repuestos Motos</FootLink>
              <FootLink href="/catalogo?cat=Lubricantes" route>Lubricantes y Filtros</FootLink>
            </div>
          </div>

          <div>
            <div style={labelStyle}>EMPRESA</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FootLink href={hash("nosotros")}>Nosotros</FootLink>
              <FootLink href={hash("detailing")}>Línea Detailing</FootLink>
              <FootLink href="/catalogo" route>Productos</FootLink>
              <FootLink href={hash("contacto")}>Contacto</FootLink>
            </div>
          </div>

          <div>
            <div style={labelStyle}>CONTACTO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FootLink href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</FootLink>
              <FootLink href={`mailto:${EMAIL}`}>{EMAIL}</FootLink>
              <FootLink href={waLink()}>WhatsApp</FootLink>
              <span style={{ font: "500 14px/1.4 'IBM Plex Sans',sans-serif", color: "#7E90A2" }}>{HOURS}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, paddingTop: 24 }}>
          <span style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#5E6F80" }}>
            © 2026 CROW REPUESTOS · TODOS LOS DERECHOS RESERVADOS
          </span>
          <span style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#5E6F80" }}>DISTRIBUIDORA AUTOMOTRIZ</span>
        </div>
      </div>
    </footer>
  );
}
