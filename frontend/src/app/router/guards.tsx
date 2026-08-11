import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/entities/session";
import { CenteredSpinner } from "@/shared/ui";

/** Requires any authenticated user. Redirects to /login otherwise. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <CenteredSpinner label="Cargando…" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/** Requires the ADMIN role. Non-admins are sent home. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <CenteredSpinner label="Verificando acceso…" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * For guest-only pages (login/register): authenticated users skip them.
 *
 * El destino se calcula con el MISMO criterio que usa `AuthPanel` al terminar
 * de loguear (`from` primero, después el área que le corresponde al rol). No es
 * una duplicación cosmética: los dos corren, y si no coinciden gana este.
 *
 * Al loguearse pasan tres cosas en este orden:
 *
 *   1. `login()` hace `setUser(...)`, y React commitea un render en el que la
 *      URL TODAVÍA es /login pero la sesión ya está abierta. Este guard ve a
 *      alguien autenticado y devuelve un `<Navigate>`, cuyo efecto queda
 *      encolado (los efectos pasivos no corren en el commit).
 *   2. Recién después la continuación de `AuthPanel` llama a su `navigate`.
 *   3. Y por último se vacía la cola de efectos, así que el `<Navigate>` del
 *      punto 1 se aplica ÚLTIMO y pisa al del punto 2.
 *
 * Con el destino fijo en "/cuenta" eso rompía el login del admin y nada más: un
 * cliente va a /cuenta por los dos caminos, así que la carrera existía pero no
 * se notaba. El admin apretaba Ingresar, la barra de direcciones parpadeaba
 * /admin y terminaba en /cuenta. Los 23 tests E2E que empiezan por
 * `loginAsAdmin` fallaban con "expected /admin, got /cuenta".
 *
 * Calcular el mismo destino que `AuthPanel` hace que el orden deje de importar:
 * gane quien gane, la URL final es la correcta. De paso arregla el caso directo
 * -- un admin con sesión abierta que entra a /login ahora va al panel y no a
 * /cuenta.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <CenteredSpinner label="Cargando…" />;
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? (isAdmin ? "/admin" : "/cuenta")} replace />;
  }
  return <>{children}</>;
}
