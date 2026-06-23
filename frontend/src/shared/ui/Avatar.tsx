import { color, font } from "@/shared/config/theme";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, size = 38, dark }: { name: string; size?: number; dark?: boolean }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: dark ? "rgba(255,255,255,.1)" : color.primarySoft,
        color: dark ? "#fff" : color.primaryDark,
        fontFamily: font.display,
        fontWeight: 700,
        fontSize: size * 0.38,
      }}
    >
      {initials(name) || "?"}
    </span>
  );
}
