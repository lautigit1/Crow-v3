import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Container, PageHeader } from "@/shared/ui";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { scrollAId } from "@/shared/lib/lenisScroll";
import { useSiteSettings } from "@/entities/settings/useSiteSettings";
import { LEGAL_DOCS, legalDoc, type LegalDocKey } from "@/shared/config";
import { ETIQUETA_CAMPO, LEGAL_BORRADOR, TITULAR, type TitularCampo } from "./titular";

/**
 * Una sección del documento. El `id` es el ancla real a la que apunta el
 * índice, así que índice y contenido salen de la misma lista y no pueden
 * desincronizarse.
 */
export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

const CONTACTO_ID = "contacto";

/**
 * Estructura común de todos los documentos legales: encabezado, índice,
 * secciones numeradas, datos de contacto y enlaces al resto de los
 * documentos. Cada página solo aporta su texto.
 */
export function LegalDocument({
  doc: key,
  intro,
  sections,
}: {
  doc: LegalDocKey;
  /** Párrafo de entrada: qué cubre este documento y qué no. */
  intro: ReactNode;
  sections: LegalSection[];
}) {
  const doc = legalDoc(key);
  usePageMeta(doc.title, doc.description);

  const toc = [...sections.map(({ id, title }) => ({ id, title })), { id: CONTACTO_ID, title: "Contacto" }];
  const activo = useSeccionActiva(toc.map((t) => t.id));

  return (
    <>
      {/* Sin bajada en el encabezado: la descripción del registro va a los
          metadatos, y la entrada del documento (`intro`) ya la cumple en la
          página. Las dos juntas decían lo mismo dos veces. */}
      <PageHeader title={doc.title} meta={`Última actualización: ${doc.updated}`} />

      <section className="bg-white pb-24 pt-10 md:pt-16">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
            {/* Índice lateral: solo en pantallas anchas. */}
            <nav aria-label="Índice del documento" className="hidden lg:sticky lg:top-24 lg:block">
              <p className="m-0 mb-3 font-body text-caption text-textFaint">En este documento</p>
              <IndiceLista items={toc} activo={activo} />
              <OtrosDocumentos actual={key} className="mt-10 border-t border-border pt-6" />
            </nav>

            <article className="min-w-0 max-w-[700px]">
              {LEGAL_BORRADOR && (
                <p className="m-0 mb-8 border-l-2 border-warning pl-4 font-body text-body-sm text-textMuted">
                  Versión preliminar, pendiente de revisión por un profesional del derecho. Los datos
                  marcados como «a completar» todavía no fueron informados por el titular.
                </p>
              )}

              <div className="font-body text-lead text-ink800 [&_p]:m-0">{intro}</div>

              {/* Índice en mobile: plegado para no empujar el texto hacia abajo. */}
              <details className="group mt-8 rounded-md border border-border lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-body text-body-sm font-medium text-ink900 [&::-webkit-details-marker]:hidden">
                  Contenido del documento
                  <span aria-hidden="true" className="text-textFaint transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="border-t border-border px-4 py-3">
                  <IndiceLista items={toc} activo={activo} />
                </div>
              </details>

              {sections.map((s, i) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="mt-14 scroll-mt-24">
                  <h2 id={`${s.id}-titulo`} tabIndex={-1} className="m-0 mb-5 font-display text-display-sm font-medium text-ink900 outline-none">
                    <span className="text-textFaint">{i + 1}.</span> {s.title}
                  </h2>
                  <div className="flex flex-col gap-4">{s.content}</div>
                </section>
              ))}

              <section id={CONTACTO_ID} aria-labelledby="contacto-titulo" className="mt-14 scroll-mt-24 border-t border-ink900 pt-8">
                <h2 id="contacto-titulo" tabIndex={-1} className="m-0 mb-5 font-display text-display-sm font-medium text-ink900 outline-none">
                  Contacto
                </h2>
                <DatosDeContacto />
              </section>

              <OtrosDocumentos actual={key} className="mt-14 border-t border-border pt-8 lg:hidden" />
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}

function IndiceLista({ items, activo }: { items: { id: string; title: string }[]; activo: string | null }) {
  const ir = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollAId(id);
    // El hash queda en la URL para poder compartir el enlace a una sección.
    window.history.replaceState(window.history.state, "", `#${id}`);
    // El foco acompaña al lector: Tab sigue desde la sección elegida.
    document.getElementById(`${id}-titulo`)?.focus({ preventScroll: true });
  };

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((item, i) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={(e) => ir(e, item.id)}
            aria-current={activo === item.id ? "location" : undefined}
            className={clsx(
              "block border-l-2 py-1.5 pl-3 font-body text-[14px] leading-snug no-underline transition-colors duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              activo === item.id
                ? "border-primary text-ink900"
                : "border-border text-textMuted hover:border-borderStrong hover:text-ink900"
            )}
          >
            {i < items.length - 1 ? `${i + 1}. ` : ""}
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

function OtrosDocumentos({ actual, className }: { actual: LegalDocKey; className?: string }) {
  return (
    <nav aria-label="Otros documentos legales" className={className}>
      <p className="m-0 mb-3 font-body text-caption text-textFaint">Otros documentos legales</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {LEGAL_DOCS.filter((d) => d.key !== actual).map((d) => (
          <li key={d.key}>
            <Link
              to={d.path}
              className="font-body text-[14px] text-textMuted underline decoration-border underline-offset-4 hover:text-ink900 hover:decoration-ink900"
            >
              {d.short}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Bloque de contacto común: titular, canales reales y domicilio. */
function DatosDeContacto() {
  const contact = useSiteSettings();
  const filas: { label: string; value: ReactNode }[] = [
    { label: "Titular", value: <Dato campo="razonSocial" /> },
    { label: "CUIT", value: <Dato campo="cuit" /> },
    { label: "Domicilio legal", value: <Dato campo="domicilioLegal" /> },
    { label: "Email", value: <A href={`mailto:${contact.email}`}>{contact.email}</A> },
    { label: "Teléfono y WhatsApp", value: <A href={`tel:+${contact.whatsapp_number}`}>{contact.phone_display}</A> },
    { label: "Horario de atención", value: contact.hours },
  ];
  return (
    <>
      <P>Para consultas sobre este documento o para ejercer cualquiera de los derechos descriptos, podés escribirnos por estos medios:</P>
      <dl className="m-0 mt-5 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[180px_1fr] sm:gap-y-4">
        {filas.map((f) => (
          <div key={f.label} className="contents">
            <dt className="mt-3 font-body text-body-sm text-textFaint sm:mt-0">{f.label}</dt>
            <dd className="m-0 font-body text-body text-ink900">{f.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Marca la sección que se está leyendo para resaltarla en el índice. */
function useSeccionActiva(ids: string[]) {
  const [activo, setActivo] = useState<string | null>(ids[0] ?? null);
  const clave = ids.join("|");

  useEffect(() => {
    const lista = clave.split("|");
    const elementos = lista.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elementos.length === 0 || typeof IntersectionObserver === "undefined") return;

    const visibles = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        const primero = lista.find((id) => visibles.has(id));
        if (primero) setActivo(primero);
      },
      // Franja de lectura: entre la barra fija y el 60% de la pantalla.
      { rootMargin: "-96px 0px -40% 0px" }
    );
    elementos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [clave]);

  return activo;
}

// ─── Piezas de texto ───────────────────────────────────────────────────────────

export function P({ children }: { children: ReactNode }) {
  return <p className="m-0 font-body text-body text-textMuted">{children}</p>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="m-0 mt-4 font-body text-title font-medium text-ink900">{children}</h3>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="m-0 flex flex-col gap-2 pl-5 font-body text-body text-textMuted marker:text-textFaint">{children}</ul>
  );
}

/** Enlace dentro del texto. Los internos usan el router; los externos abren en otra pestaña. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const externo = /^https?:\/\//.test(href);
  const cls = "text-primary underline decoration-[rgba(0,87,217,.35)] underline-offset-2 hover:decoration-primary";
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} {...(externo ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
      {children}
    </a>
  );
}

/** Nota destacada dentro de una sección (p. ej. la leyenda informativa de la AAIP). */
export function Nota({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-surface px-5 py-4 font-body text-body-sm text-ink800">{children}</div>;
}

/** Dato del titular: el valor real o un marcador visible de que falta. */
export function Dato({ campo }: { campo: TitularCampo }) {
  const valor = TITULAR[campo];
  if (valor) return <>{valor}</>;
  return (
    <mark className="rounded-sm bg-warningSoft px-1 font-medium text-warning">
      [{ETIQUETA_CAMPO[campo]}: a completar]
    </mark>
  );
}

/** Tabla simple con encabezado, para cookies y licencias. Se desplaza en mobile. */
export function Tabla({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[520px] border-collapse font-body text-[14px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-ink900 px-3 py-2.5 text-left font-medium text-ink900 first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border-b border-border px-3 py-3 align-top text-textMuted first:pl-0">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
