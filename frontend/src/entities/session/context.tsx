import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, login as loginRequest, register as registerRequest, logout as logoutRequest } from "./api";
import type { User } from "./model";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { full_name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Vive en `entities/session` (no en `app/providers`, donde estaba antes) porque
// el estado de sesión es un concepto de negocio (la entidad "sesión de
// usuario"), y varias `pages`/`widgets`/`features` lo consumen -- tenerlo en
// `app` (la capa más alta) violaba la regla de FSD de que ninguna capa puede
// importar "hacia arriba". `app/providers/AuthProvider.tsx` ahora solo
// re-exporta este componente para usarlo al armar el árbol de providers en
// `main.tsx`, que sí puede importar desde cualquier capa.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from the HttpOnly cookie — if the browser has a valid
  // access_token cookie it is sent automatically and /me returns the user.
  // No token reading from JavaScript; the cookie is invisible to us on purpose.
  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch((err) => {
        // 401 is the expected case (no session cookie yet) -- not an error.
        // Anything else (network down, 500, etc.) is worth knowing about.
        if (err?.response?.status !== 401) {
          console.error("[AuthProvider] fetchMe falló de forma inesperada:", err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginRequest(email, password);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(
    async (payload: { full_name: string; email: string; password: string; phone?: string }) => {
      const user = await registerRequest(payload);
      setUser(user);
      return user;
    },
    []
  );

  const logout = useCallback(() => {
    // Clear React state immediately for instant UI feedback
    setUser(null);
    // Ask the server to clear the HttpOnly cookies (fire and forget --
    // React state is already cleared above regardless of the outcome).
    void logoutRequest().catch((err) => {
      console.error("[AuthProvider] logout en el servidor falló (sesión local ya se cerró igual):", err);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
      setUser,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
