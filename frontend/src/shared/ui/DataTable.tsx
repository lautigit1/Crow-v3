import type { ReactNode } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";

export type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
  width?: number | string;
  align?: "left" | "right" | "center";
  /** When set, the header becomes a clickable sort control. */
  sortKey?: string;
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
  return (
    <div className="bg-white border border-border rounded-[10px] overflow-hidden">
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
    </div>
  );
}
