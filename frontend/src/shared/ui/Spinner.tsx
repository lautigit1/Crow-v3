import { color } from "@/shared/config/theme";

export function Spinner({ size = 20, stroke = color.primary }: { size?: number; stroke?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color.border}`,
        borderTopColor: stroke,
        borderRadius: "50%",
        animation: "spin .7s linear infinite",
      }}
    />
  );
}

export function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0" }}>
      <Spinner size={28} />
      {label && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: color.textFaint }}>{label}</span>}
    </div>
  );
}
