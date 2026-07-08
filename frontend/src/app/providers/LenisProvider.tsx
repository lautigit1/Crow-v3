import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

/**
 * Scroll suave con inercia para el sitio público (landing, catálogo, etc.).
 * Se monta solo en PublicLayout a propósito: el panel de admin tiene tablas
 * con su propio scroll interno y no se beneficia de este efecto — mezclarlo
 * ahí solo agregaría fricción a flujos de trabajo repetitivos.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Respeta la preferencia de "reducir movimiento" del sistema operativo.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
