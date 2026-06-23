import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { color, font } from "@/shared/config/theme";

export type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
  width?: number | string;
  align?: "left" | "right" | "center";
  /** When set, the header becomes a clickable sort control. */
  sortKey?: string;
};

export type SortState = { key: string; dir: "asc" | "desc" };

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
    <div style={{ background: "#fff", border: `1px solid ${color.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ background: color.surface }}>
              {columns.map((c, i) => {
                const sortable = !!c.sortKey && !!onSort;
                const active = sort && c.sortKey === sort.key;
                return (
                  <th
                    key={i}
                    onClick={sortable ? () => onSort!(c.sortKey!) : undefined}
                    style={{
                      textAlign: c.align ?? "left",
                      padding: "13px 16px",
                      fontFamily: font.mono,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: ".06em",
                      color: active ? color.primary : color.textFaint,
                      textTransform: "uppercase",
                      width: c.width,
                      borderBottom: `1px solid ${color.border}`,
                      whiteSpace: "nowrap",
                      cursor: sortable ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, justifyContent: c.align === "right" ? "flex-end" : "flex-start" }}>
                      {c.header}
                      {sortable && (
                        <span style={{ opacity: active ? 1 : 0.35 }}>
                          <Icon name="chevronDown" size={13} style={{ transform: active && sort?.dir === "asc" ? "rotate(180deg)" : "none" }} />
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
                <td colSpan={columns.length} style={{ padding: "40px 16px", textAlign: "center", fontFamily: font.body, fontSize: 14, color: color.textFaint }}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ borderBottom: `1px solid ${color.border}`, cursor: onRowClick ? "pointer" : "default", transition: "background .12s" }}
                  onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = color.surface)}
                  onMouseLeave={(e) => onRowClick && (e.currentTarget.style.background = "transparent")}
                >
                  {columns.map((c, i) => (
                    <td key={i} style={{ padding: "13px 16px", textAlign: c.align ?? "left", fontFamily: font.body, fontSize: 14, color: color.ink800, verticalAlign: "middle" }}>
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
