import { Link } from "react-router-dom";

type LogoProps = {
  /** Background of the diamond inside the mark (matches section background). */
  innerColor?: string;
  size?: "header" | "footer";
};

/** The Crow Repuestos wordmark with its diamond glyph. */
export default function Logo({ innerColor = "#0066FF", size = "header" }: LogoProps) {
  const isFooter = size === "footer";
  const box = isFooter ? 38 : 40;
  const diamond = isFooter ? 12 : 13;
  const markBg = isFooter ? "#0066FF" : "#0A1622";

  return (
    <Link to="/" style={{ display: "flex", alignItems: "center", gap: isFooter ? 12 : 13 }}>
      <span
        style={{
          width: box,
          height: box,
          background: markBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <span style={{ width: diamond, height: diamond, background: innerColor, transform: "rotate(45deg)", display: "block" }} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ font: `900 ${isFooter ? 20 : 22}px/1 'Archivo',sans-serif`, letterSpacing: ".04em", color: isFooter ? "#fff" : "#0A1622" }}>
          CROW
        </span>
        <span
          style={{
            font: `500 ${isFooter ? 9 : 9.5}px/1 'IBM Plex Mono',monospace`,
            letterSpacing: isFooter ? ".4em" : ".42em",
            color: isFooter ? "#7E90A2" : "#0066FF",
            marginTop: 3,
          }}
        >
          REPUESTOS
        </span>
      </span>
    </Link>
  );
}
