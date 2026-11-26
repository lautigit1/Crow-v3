import type * as React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Container, Logo } from "@/shared/ui";
import { LEGAL_DOCS } from "@/shared/config";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";

// FLink / InfoRow links used a `Hoverable` (JS onMouseEnter/Leave) wrapper
// purely to swap a static text color on hover -- that's exactly what
// `hover:` does natively, so it's dropped here. `Hoverable` was also the
// last thing using `pages/brands/BrandsPage.tsx`'s old inline styles; now
// that both are migrated, `shared/lib/Hoverable.tsx` is unused and removed.
// Contraste: los grises viejos del footer (#4E6175, #283D52, #1E3148) daban
// entre 1,4:1 y 3,2:1 sobre ink900, debajo del mínimo AA. Todo el texto
// secundario pasa a textOnDarkFaint (#94A3B8, ~7:1) y los títulos a blanco.
const linkClass =
  "font-body text-[14px] text-textOnDarkFaint no-underline hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF] rounded-sm";

function FLink({ children, to, href }: { children: React.ReactNode; to?: string; href?: string }) {
  if (to) return <Link to={to} className={linkClass}>{children}</Link>;
  return <a href={href} className={linkClass}>{children}</a>;
}

function WaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function IgIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FbIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function SocialBtn({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={clsx(
        "w-9 h-9 rounded-full border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)]",
        "flex items-center justify-center text-textOnDarkFaint no-underline",
        "[transition:background-color_.15s,color_.15s,border-color_.15s]",
        "hover:bg-[rgba(255,255,255,.12)] hover:text-white hover:border-[rgba(255,255,255,.22)]"
      )}
    >
      {children}
    </a>
  );
}

export function Footer() {
  const contact = useSiteSettings();
  const waLink = useWaLink();
  return (
    <footer className="bg-ink900 border-t border-[rgba(255,255,255,.08)]">

      <Container>

        {/* ── Main body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start pt-12 pb-9 md:pt-16 md:pb-[52px] border-b border-[rgba(255,255,255,.07)]">

          {/* Left — brand */}
          <div className="max-w-[400px]">
            <div className="mb-[22px]">
              <Logo variant="dark" />
            </div>

            {/* Tagline */}
            <p className="font-body text-[14px] leading-[1.65] text-textOnDarkFaint mt-0 mx-0 mb-6">
              Repuestos, lubricantes, baterías, filtros y detailing para autos, motos y camiones. Atención directa desde Mendoza.
            </p>


            {/* Socials */}
            <div className="flex gap-2">
              <SocialBtn href={contact.instagram} label="Instagram"><IgIcon /></SocialBtn>
              <SocialBtn href={contact.facebook} label="Facebook"><FbIcon /></SocialBtn>
              <SocialBtn href={waLink()} label="WhatsApp"><WaIcon /></SocialBtn>
            </div>
          </div>

          {/* Right — catálogo, sitio, legales y contacto. Dos columnas en
              mobile (Contacto ocupa el ancho completo), cuatro desde lg. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 pt-1 md:grid-cols-[1fr_1fr_1.2fr_1.3fr] lg:gap-x-10">

            {/* Catálogo: los mismos accesos por tipo de vehículo que la home. */}
            <nav aria-label="Catálogo">
              <ColTitle>Catálogo</ColTitle>
              <div className="flex flex-col gap-3">
                <FLink to="/catalogo">Todo el catálogo</FLink>
                <FLink to="/catalogo?tipo=Autos">Autos</FLink>
                <FLink to="/catalogo?tipo=Camiones">Camiones</FLink>
                <FLink to="/catalogo?tipo=Motos">Motos</FLink>
                <FLink to="/marcas">Marcas</FLink>
              </div>
            </nav>

            <nav aria-label="Sitio">
              <ColTitle>Sitio</ColTitle>
              <div className="flex flex-col gap-3">
                <FLink to="/">Inicio</FLink>
                <FLink to="/contacto">Contacto</FLink>
                <FLink to="/faq">Preguntas frecuentes</FLink>
                <FLink to="/cuenta">Mi cuenta</FLink>
              </div>
            </nav>

            {/* Legales: todos los documentos del registro marcados para el
                footer, así una página nueva aparece acá sin tocar este archivo. */}
            <nav aria-label="Información legal">
              <ColTitle>Legales</ColTitle>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {LEGAL_DOCS.filter((d) => d.inFooter).map((d) => (
                  <li key={d.key}>
                    <FLink to={d.path}>{d.short}</FLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Contact — always rightmost */}
            <div className="col-span-2 md:col-span-1 lg:border-l lg:border-[rgba(255,255,255,.07)] lg:pl-12">
              <ColTitle>Contacto</ColTitle>
              <div className="flex flex-col gap-[18px]">
                <InfoRow label="WhatsApp" value={contact.phone_display} href={waLink()} />
                <InfoRow label="Email" value={contact.email} href={`mailto:${contact.email}`} />
                <InfoRow label="Atención" value={contact.hours} />
                <InfoRow label="Ubicación" value={contact.address} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 md:gap-4 py-5 flex-wrap text-center md:text-left">
          <span className="font-body text-[12px] text-textOnDarkFaint">
            © {new Date().getFullYear()} Crow Repuestos. Todos los derechos reservados.
          </span>
          <span className="font-body text-[12px] text-textOnDarkFaint">
            Hecho en Mendoza
          </span>
        </div>
      </Container>
    </footer>
  );
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-body text-[14px] font-medium text-white mb-4">
      {children}
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div className="font-body text-[12px] text-textOnDarkFaint mb-0.5">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className="font-body text-[14px] text-textOnDark no-underline hover:text-white"
        >
          {value}
        </a>
      ) : (
        <span className="font-body text-[14px] text-textOnDark">{value}</span>
      )}
    </div>
  );
}
