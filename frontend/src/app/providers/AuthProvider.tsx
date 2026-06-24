import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, login as loginRequest, register as registerRequest, logout as logoutRequest } from "@/entities/session/api";
import type { User } from "@/entities/session/model";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from the HttpOnly cookie — if the browser has a valid
  // access_token cookie it is sent automatically and /me returns the user.
  // No token reading from JavaScript; the cookie is invisible to us on purpose.
  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => { /* no active session — that's fine */ })
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
    // Ask the server to clear the HttpOnly cookies (fire and forget)
    void logoutRequest().catch(() => {});
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
