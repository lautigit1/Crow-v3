import clsx from "clsx";
import { Icon } from "./Icon";

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

  const btnClass = (disabled: boolean) =>
    clsx(
      "w-9 h-9 flex items-center justify-center border border-border rounded-sm bg-white",
      disabled ? "text-borderStrong cursor-default" : "text-ink700 cursor-pointer"
    );

  return (
    <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
      <span className="font-body text-[13px] text-textMuted">
        Mostrando <strong className="text-ink900">{from}–{to}</strong> de {total}
      </span>
      <div className="flex items-center gap-2">
        <button className={btnClass(page <= 0)} disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label="Anterior">
          <Icon name="chevronRight" size={16} className="rotate-180" />
        </button>
        <span className="font-mono text-[13px] text-ink800 min-w-[70px] text-center">
          {page + 1} / {pages}
        </span>
        <button className={btnClass(page >= pages - 1)} disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Siguiente">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
