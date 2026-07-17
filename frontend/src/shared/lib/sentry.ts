import * as Sentry from "@sentry/react";

/**
 * Error tracking opcional (Sentry) -- hallazgo de la auditoría técnica del
 * 2026-07-13: sin esto, un error en producción solo se detecta si un
 * usuario lo reporta a mano.
 *
 * Sin `VITE_SENTRY_DSN` configurado (default en dev y en CI), esta función
 * no inicializa nada -- `Sentry.captureException` sigue siendo seguro de
 * llamar desde `ErrorBoundary` en ese caso, simplemente no hace nada.
 *
 * `VITE_SENTRY_DSN` se resuelve en build time (Vite reemplaza
 * `import.meta.env.*` por su valor literal al buildear) -- ver
 * `frontend/Dockerfile`, que lo recibe como build arg.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Sampleo bajo -- suficiente para ver tendencias de performance sin
    // generar volumen innecesario en el plan gratuito/inicial de Sentry.
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
