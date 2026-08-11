import type { ReactNode } from "react";
import clsx from "clsx";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { Icon } from "./Icon";

/**
 * Qué hace esta columna cuando la tabla se convierte en tarjetas.
 *
 * En una pantalla angosta una tabla de siete columnas no entra: la solución
 * anterior era `min-w-[640px]` + scroll horizontal, o sea empujarle el problema
 * a la persona. Abajo de 768px cada fila pasa a ser una tarjeta, y para eso hay
 * que saber qué dato manda.
 *
 *   `titulo`    — el encabezado de la tarjeta. Uno por tabla.
 *   `subtitulo` — debajo del título, sin etiqueta.
 *   `accion`    — botones. Van al pie, separados por una línea.
 *   `oculta`    — no se muestra en la tarjeta. Para columnas redundantes
 *                 (un id que ya está en el título) o demasiado anchas.
 *   sin definir — fila de etiqueta + valor dentro de la tarjeta.
 *
 * **Si una tabla no declara ningún rol, la primera columna se toma como
 * título.** Así las nueve pantallas que ya existen mejoran sin tocarlas, y
 * cada una se puede afinar después.
 */
export type RolEnTarjeta = "titulo" | "subtitulo" | "accion" | "oculta";

export type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
  width?: number | string;
  align?: "left" | "right" | "center";
  /** When set, the header becomes a clickable sort control. */
  sortKey?: string;
  /** Ver `RolEnTarjeta`. Solo afecta a la vista de tarjetas (<768px). */
  rol?: RolEnTarjeta;
};

export type SortState = { key: string; dir: "asc" | "desc" };

const alignClass = (align?: "left" | "right" | "center") =>
  align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty = "Sin registros",
  sort,
  onSort,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  empty?: string;
  sort?: SortState;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
}) {
  // Se renderiza UNA sola de las dos vistas, no las dos con `hidden`/`md:hidden`.
  //
  // El primer intento fue puro CSS -- sin listener de resize, sin re-render --
  // y **rompió 34 tests que ya existían**: con las dos versiones en el DOM,
  // cada `getByText` de las suites del panel encontraba dos resultados. Ese
  // fallo es la señal de un problema real y no una molestia de los tests: la
  // duplicación se filtra a cualquier cosa que consulte el DOM, incluidos los
  // E2E y las herramientas de accesibilidad.
  //
  // El costo de esta versión es un listener de resize por tabla. Es el mismo
  // patrón que ya usa `CatalogPage` para alternar sidebar y drawer.
  const { isMobile } = useBreakpoint();

  // Reparto de columnas para la vista de tarjetas. Se calcula una vez y no por
  // fila: es el mismo para todas.
  const declaraRoles = columns.some((c) => c.rol);
  const titulo = columns.find((c) => c.rol === "titulo") ?? (declaraRoles ? undefined : columns[0]);
  const subtitulo = columns.find((c) => c.rol === "subtitulo");
  const acciones = columns.filter((c) => c.rol === "accion");
  const datos = columns.filter(
    (c) => c !== titulo && c !== subtitulo && c.rol !== "accion" && c.rol !== "oculta",
  );

  return (
    <div className="bg-white border border-border rounded-[10px] overflow-hidden">
      {/* ── Tabla: 768px para arriba ── */}
      {!isMobile && (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-surface">
              {columns.map((c, i) => {
                const sortable = !!c.sortKey && !!onSort;
                const active = sort && c.sortKey === sort.key;
                return (
                  <th
                    key={i}
                    onClick={sortable ? () => onSort!(c.sortKey!) : undefined}
                    className={clsx(
                      alignClass(c.align),
                      "py-[13px] px-4 font-mono text-[11px] font-semibold tracking-[0.06em] uppercase border-b border-border whitespace-nowrap select-none",
                      active ? "text-primary" : "text-textFaint",
                      sortable ? "cursor-pointer" : "cursor-default"
                    )}
                    style={{ width: c.width }}
                  >
                    <span
                      className={clsx(
                        "inline-flex items-center gap-[5px]",
                        c.align === "right" ? "justify-end" : "justify-start"
                      )}
                    >
                      {c.header}
                      {sortable && (
                        <span className={active ? "opacity-100" : "opacity-[0.35]"}>
                          <Icon
                            name="chevronDown"
                            size={13}
                            className={active && sort?.dir === "asc" ? "rotate-180" : undefined}
                          />
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 px-4 text-center font-body text-[14px] text-textFaint"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={getKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    "border-b border-border transition-[background-color] duration-[120ms]",
                    idx % 2 === 1 ? "bg-[#FAFBFD]" : "bg-white",
                    onRowClick ? "cursor-pointer hover:bg-primarySoft" : "cursor-default"
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={clsx(
                        alignClass(c.align),
                        "py-[13px] px-4 font-body text-[14px] text-ink800 align-middle"
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Tarjetas: abajo de 768px ── */}
      {isMobile && (
      <div>
        {rows.length === 0 ? (
          <div className="py-10 px-4 text-center font-body text-[14px] text-textFaint">{empty}</div>
        ) : (
          rows.map((row) => (
            <div
              key={getKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                "border-b border-border last:border-b-0 p-4",
                onRowClick ? "cursor-pointer active:bg-primarySoft" : "cursor-default",
              )}
            >
              {titulo && (
                <div className="font-body text-[15px] font-semibold text-ink900 leading-snug">
                  {titulo.render(row)}
                </div>
              )}
              {subtitulo && (
                <div className="font-body text-[13px] text-textMuted mt-0.5">
                  {subtitulo.render(row)}
                </div>
              )}

              {datos.length > 0 && (
                <dl className="mt-3 flex flex-col gap-1.5">
                  {datos.map((c, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3">
                      {/* La etiqueta acá SÍ hace falta: en la tabla el
                          encabezado de columna da el contexto una vez arriba;
                          en una tarjeta cada valor queda huérfano sin ella. */}
                      <dt className="font-body text-[12.5px] text-textFaint shrink-0">{c.header}</dt>
                      <dd className="font-body text-[13.5px] text-ink800 m-0 text-right min-w-0">
                        {c.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {acciones.length > 0 && (
                // `stopPropagation`: si la tarjeta entera es clickeable, tocar
                // un botón dispararía también el onRowClick y se abriría la
                // ficha además de ejecutarse la acción.
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3.5 pt-3 border-t border-border flex flex-wrap items-center gap-2"
                >
                  {acciones.map((c, i) => (
                    <div key={i}>{c.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
}
