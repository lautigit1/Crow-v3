import { api } from "@/shared/api/client";
import type { User } from "./model";

/** Login — server sets HttpOnly cookies, returns the User object only. */
export async function login(email: string, password: string): Promise<User> {
  // FastAPI OAuth2 expects form-encoded `username` / `password`.
  const body = new URLSearchParams({ username: email, password });
  const { data } = await api.post<{ user: User }>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data.user;
}

/** Register — same as login: sets cookies, returns User. */
export async function register(payload: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<User> {
  const { data } = await api.post<{ user: User }>("/auth/register", payload);
  return data.user;
}

/** Logout — server clears the HttpOnly cookies. */
export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

/** Fetch current session user — works as long as the access_token cookie is valid. */
export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
