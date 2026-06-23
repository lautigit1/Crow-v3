import type * as React from "react";
import { Icon } from "./Icon";
import { color, font, radius } from "@/shared/config/theme";

/** Compact pager: "Mostrando X–Y de N" + prev/next + page indicator. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number; // 0-based
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const btn = (disabled: boolean): React.CSSProperties => ({
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${color.border}`,
    borderRadius: radius.sm,
    background: "#fff",
    color: disabled ? color.borderStrong : color.ink700,
    cursor: disabled ? "default" : "pointer",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
      <span style={{ fontFamily: font.body, fontSize: 13, color: color.textMuted }}>
        Mostrando <strong style={{ color: color.ink900 }}>{from}–{to}</strong> de {total}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button style={btn(page <= 0)} disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label="Anterior">
          <Icon name="chevronRight" size={16} style={{ transform: "rotate(180deg)" }} />
        </button>
        <span style={{ fontFamily: font.mono, fontSize: 13, color: color.ink800, minWidth: 70, textAlign: "center" }}>
          {page + 1} / {pages}
        </span>
        <button style={btn(page >= pages - 1)} disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Siguiente">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
