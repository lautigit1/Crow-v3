import { Link } from "react-router-dom";
import { color, font, radius } from "@/shared/config/theme";
import { usePageMeta } from "@/shared/lib/usePageMeta";

export function NotFoundPage() {
  usePageMeta("404 — Crow Repuestos", "Esta página no existe.");

  return (
    <section style={{ background: color.ink900, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Glow */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,87,217,.18) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
        {/* Big number */}
        <div style={{
          fontFamily: font.display, fontSize: 140, fontWeight: 900, lineHeight: 1,
          letterSpacing: "-.04em",
          background: "linear-gradient(135deg, #1A3A6B 0%, #0057D9 50%, #7FB0FF 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: 8,
        }}>
          404
        </div>

        <h1 style={{ fontFamily: font.display, fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-.01em" }}>
          Página no encontrada
        </h1>
        <p style={{ fontFamily: font.body, fontSize: 15, color: "#4E6B82", marginBottom: 36, maxWidth: 340, margin: "0 auto 36px" }}>
          La URL no existe o fue movida. Podés volver al inicio y seguir navegando.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{
            fontFamily: font.display, fontSize: 15, fontWeight: 700,
            background: color.primary, color: "#fff",
            padding: "13px 28px", borderRadius: radius.pill,
            textDecoration: "none",
            boxShadow: "0 6px 20px rgba(0,87,217,.35)",
            transition: "opacity .15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Volver al inicio
          </Link>
          <Link to="/catalogo" style={{
            fontFamily: font.display, fontSize: 15, fontWeight: 700,
            background: "rgba(255,255,255,.06)", color: "#fff",
            border: "1px solid rgba(255,255,255,.14)",
            padding: "13px 28px", borderRadius: radius.pill,
            textDecoration: "none",
            transition: "background .15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
          >
            Ver catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
