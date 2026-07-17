import type * as React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Container, Logo } from "@/shared/ui";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";

// FLink / InfoRow links used a `Hoverable` (JS onMouseEnter/Leave) wrapper
// purely to swap a static text color on hover -- that's exactly what
// `hover:` does natively, so it's dropped here. `Hoverable` was also the
// last thing using `pages/brands/BrandsPage.tsx`'s old inline styles; now
// that both are migrated, `shared/lib/Hoverable.tsx` is unused and removed.
const linkClass = "font-body text-[13.5px] text-[#7A95AA] no-underline hover:text-white";

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
        "flex items-center justify-center text-[#4E6175] no-underline",
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
    <footer className="bg-ink900 relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,87,217,.5)_40%,rgba(0,87,217,.5)_60%,transparent)] pointer-events-none" />

      {/* Glow */}
      <div className="absolute -top-40 -left-[60px] w-[560px] h-[560px] bg-[radial-gradient(circle,rgba(0,87,217,.06)_0%,transparent_70%)] pointer-events-none" />

      <Container>

        {/* ── Main body ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-20 items-start pt-12 pb-9 md:pt-16 md:pb-[52px] border-b border-[rgba(255,255,255,.07)]">

          {/* Left — brand */}
          <div className="max-w-[400px]">
            <div className="mb-[22px]">
              <Logo variant="dark" />
            </div>

            {/* Tagline */}
            <p className="font-body text-sm leading-[1.75] text-[#4E6175] mt-0 mx-0 mb-2.5">
              Repuestos y lubricantes para tu vehículo. Atención directa desde Mendoza, sin bots ni intermediarios.
            </p>

            {/* Location pill */}
            <div className="inline-flex items-center gap-[7px] bg-[rgba(0,87,217,.1)] border border-[rgba(0,87,217,.2)] rounded-full py-[5px] px-3.5 font-mono text-[11px] text-[#5B8BDF] tracking-[.08em] mb-7">
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              MENDOZA, ARGENTINA
            </div>

            {/* Socials */}
            <div className="flex gap-2">
              <SocialBtn href={contact.instagram} label="Instagram"><IgIcon /></SocialBtn>
              <SocialBtn href={contact.facebook} label="Facebook"><FbIcon /></SocialBtn>
              <SocialBtn href={waLink()} label="WhatsApp"><WaIcon /></SocialBtn>
            </div>
          </div>

          {/* Right — nav + contact + legal */}
          <div className="flex gap-8 md:gap-[60px] pt-1 flex-wrap md:flex-nowrap">

            {/* Nav */}
            <div>
              <ColTitle>Menú</ColTitle>
              <div className="flex flex-col gap-[13px]">
                <FLink to="/">Inicio</FLink>
                <FLink to="/catalogo">Catálogo</FLink>
                <FLink to="/marcas">Marcas</FLink>
                <FLink to="/contacto">Contacto</FLink>
                <FLink to="/faq">Preguntas frecuentes</FLink>
              </div>
            </div>

            {/* Contact — always rightmost */}
            <div className="border-l-0 md:border-l md:border-[rgba(255,255,255,.07)] pl-0 md:pl-12">
              <ColTitle>Contacto</ColTitle>
              <div className="flex flex-col gap-[18px]">
                <InfoRow label="WhatsApp" value={contact.phone_display} href={waLink()} />
                <InfoRow label="Email" value={contact.email} href={`mailto:${contact.email}`} />
                <InfoRow label="Horario" value={contact.hours} />
                <InfoRow label="Ubicación" value={contact.address} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 md:gap-4 py-5 flex-wrap text-center md:text-left">
          <span className="font-mono text-[11px] text-[#1E3148] tracking-[.06em]">
            © {new Date().getFullYear()} CROW REPUESTOS · TODOS LOS DERECHOS RESERVADOS
          </span>
          <span className="font-mono text-[11px] text-[#1E3148]">
            Hecho en Mendoza 🇦🇷
          </span>
        </div>
      </Container>
    </footer>
  );
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-bold tracking-[.18em] text-[#283D52] uppercase mb-[22px]">
      {children}
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] text-[#283D52] tracking-[.1em] uppercase mb-[3px]">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className={linkClass}
        >
          {value}
        </a>
      ) : (
        <span className="font-body text-[13.5px] text-[#4E6175]">{value}</span>
      )}
    </div>
  );
}
