import type { ReactNode } from "react";
import { Icon, type IconName } from "@/shared/ui";
import { color, font } from "@/shared/config/theme";

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
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {icon && (
          <span style={{ width: 44, height: 44, borderRadius: 10, background: color.primarySoft, color: color.primaryDark, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={22} />
          </span>
        )}
        <div>
          <h1 style={{ fontFamily: font.display, fontSize: 25, fontWeight: 800, color: color.ink900, letterSpacing: "-.01em" }}>{title}</h1>
          {subtitle && <p style={{ fontFamily: font.body, fontSize: 14, color: color.textMuted, marginTop: 3 }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
