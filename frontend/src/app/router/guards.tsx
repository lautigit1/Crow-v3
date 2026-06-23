import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
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

/** For guest-only pages (login/register): authenticated users skip them. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <CenteredSpinner label="Cargando…" />;
  if (isAuthenticated) return <Navigate to="/cuenta" replace />;
  return <>{children}</>;
}
