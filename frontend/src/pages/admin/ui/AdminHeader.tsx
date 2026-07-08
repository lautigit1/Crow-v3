import type { ReactNode } from "react";
import { Icon, type IconName } from "@/shared/ui";

export function AdminHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-5 mb-[26px] flex-wrap">
      <div className="flex items-center gap-3.5">
        {icon && (
          <span className="w-11 h-11 rounded-[10px] bg-primarySoft text-primaryDark flex items-center justify-center">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div>
          <h1 className="font-display text-[25px] font-extrabold text-ink900 tracking-[-.01em]">{title}</h1>
          {subtitle && <p className="font-body text-sm text-textMuted mt-[3px]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
