import { Link } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";

export function NotFoundPage() {
  usePageMeta("404 — Crow Repuestos", "Esta página no existe.");

  return (
    <section className="bg-ink900 min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.18)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative text-center px-6">
        {/* Big number */}
        <div className="font-display text-[140px] font-black leading-none tracking-[-.04em] bg-[linear-gradient(135deg,#1A3A6B_0%,#0057D9_50%,#7FB0FF_100%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent] mb-2">
          404
        </div>

        <h1 className="font-display text-2xl font-extrabold text-white mb-3 tracking-[-.01em]">
          Página no encontrada
        </h1>
        <p className="font-body text-[15px] text-[#5E819D] mb-9 max-w-[340px] mx-auto">
          La URL no existe o fue movida. Podés volver al inicio y seguir navegando.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/"
            className="font-display text-[15px] font-bold bg-primary text-white py-[13px] px-7 rounded-full no-underline shadow-[0_6px_20px_rgba(0,87,217,.35)] transition-opacity duration-150 hover:opacity-85"
          >
            Volver al inicio
          </Link>
          <Link
            to="/catalogo"
            className="font-display text-[15px] font-bold bg-[rgba(255,255,255,.06)] text-white border border-[rgba(255,255,255,.14)] py-[13px] px-7 rounded-full no-underline transition-colors duration-150 hover:bg-[rgba(255,255,255,.1)]"
          >
            Ver catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
