import type { ReactNode } from "react";
import clsx from "clsx";
import { Container } from "./Container";

/**
 * Franja oscura con la que abren las páginas internas (marcas, preguntas
 * frecuentes, legales).
 *
 * Cada página tenía su propia versión: un degradé radial azul en una esquina
 * distinta, un rótulo en mayúsculas monoespaciadas con guion ("— FAQ",
 * "CROW REPUESTOS · LEGAL"), títulos de 38, 42 o 46px en peso 800 o 900 y
 * subtítulos en tres grises diferentes. Acá queda una sola: el título en la
 * escala del sitio, peso 500, y el subtítulo en el gris para fondo oscuro.
 *
 * `children` va a la derecha del título en desktop (el buscador del
 * catálogo, la tarjeta de horario de contacto) y debajo en mobile.
 */
export function PageHeader({
  title,
  lead,
  meta,
  children,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  /** Línea chica debajo del subtítulo (p. ej. "Última actualización"). */
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("bg-ink900", className)}>
      <Container className="py-14 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
          <div className="max-w-[600px]">
            <h1 className="m-0 font-display text-display-md font-medium text-white md:text-display-lg">{title}</h1>
            {lead && <p className="mb-0 mt-4 font-body text-body text-textOnDarkFaint">{lead}</p>}
            {meta && <p className="mb-0 mt-3 font-body text-caption text-textOnDarkFaint">{meta}</p>}
          </div>
          {children}
        </div>
      </Container>
    </section>
  );
}
