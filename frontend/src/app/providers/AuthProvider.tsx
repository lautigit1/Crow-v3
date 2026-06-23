import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tokenStore } from "@/shared/api/client";
import { fetchMe, login as loginRequest, register as registerRequest } from "@/entities/session/api";
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

  // Restore session from a stored token on first load.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token, user } = await loginRequest(email, password);
    tokenStore.set(access_token);
    tokenStore.setRefresh(refresh_token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(
    async (payload: { full_name: string; email: string; password: string; phone?: string }) => {
      const { access_token, refresh_token, user } = await registerRequest(payload);
      tokenStore.set(access_token);
      tokenStore.setRefresh(refresh_token);
      setUser(user);
      return user;
    },
    []
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
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
