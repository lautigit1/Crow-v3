import type * as React from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { Container } from "@/shared/ui";

const PAGES = [
  { to: "/legal/privacidad", label: "Política de privacidad" },
  { to: "/legal/terminos", label: "Términos y condiciones" },
  { to: "/legal/cookies", label: "Política de cookies" },
  { to: "/legal/licencias", label: "Licencias" },
  { to: "/legal/accesibilidad", label: "Accesibilidad" },
];

export function LegalLayout({ title, updated, children }: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <>
      {/* Hero */}
      <section className="bg-ink900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(700px_280px_at_80%_-10%,rgba(0,87,217,.15),transparent_65%)]" />
        <Container className="relative pt-[52px] px-10 pb-12">
          <div className="font-mono text-[11px] tracking-[.16em] text-primary mb-3.5">
            CROW REPUESTOS · LEGAL
          </div>
          <h1 className="font-display text-[38px] font-black tracking-[-.02em] text-white mt-0 mx-0 mb-3">
            {title}
          </h1>
          <p className="font-mono text-xs text-[#3A5068] tracking-[.06em]">
            Última actualización: {updated}
          </p>
        </Container>
      </section>

      {/* Body */}
      <section className="bg-surface pt-14 pb-24">
        <Container>
          <div className="grid grid-cols-[220px_1fr] gap-14 items-start">

            {/* Sidebar nav */}
            <nav className="sticky top-[100px]">
              <div className="font-mono text-[10px] tracking-[.16em] text-textFaint uppercase mb-3.5">
                Documentos legales
              </div>
              <div className="flex flex-col gap-0.5">
                {PAGES.map((p) => {
                  const active = pathname === p.to;
                  return (
                    <Link
                      key={p.to}
                      to={p.to}
                      className={clsx(
                        "font-body text-[13.5px] py-2 px-3 rounded-r-sm no-underline block border-l-2 transition-colors duration-150",
                        active
                          ? "font-semibold text-primary bg-primarySoft border-primary"
                          : "font-normal text-textMuted bg-transparent border-transparent"
                      )}
                    >
                      {p.label}
                    </Link>
                  );
                })}
              </div>

              {/* Back home */}
              <div className="mt-7 pt-5 border-t border-border">
                <Link to="/" className="font-mono text-[11px] text-textFaint no-underline tracking-[.06em]">
                  ← Volver al inicio
                </Link>
              </div>
            </nav>

            {/* Content */}
            <article className="max-w-[720px]">
              {children}
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}

// ─── Shared prose components ──────────────────────────────────────────────────

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-extrabold text-ink800 mt-10 mb-3 mx-0 tracking-[-.01em]">
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-[15px] leading-[1.8] text-textMuted mt-0 mx-0 mb-4">
      {children}
    </p>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="font-body text-[15px] leading-[1.8] text-textMuted pl-[22px] mt-0 mx-0 mb-4 flex flex-col gap-1.5">
      {children}
    </ul>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primarySoft border border-[rgba(0,87,217,.15)] border-l-[3px] border-l-primary rounded-md py-3.5 px-[18px] font-body text-sm leading-[1.7] text-ink700 my-5">
      {children}
    </div>
  );
}

export function Divider() {
  return <div className="border-t border-border my-8" />;
}
