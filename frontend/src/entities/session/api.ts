import { api } from "@/shared/api/client";
import type { AuthToken, User } from "./model";

export async function login(email: string, password: string): Promise<AuthToken> {
  // FastAPI OAuth2 expects form-encoded `username` / `password`.
  const body = new URLSearchParams({ username: email, password });
  const { data } = await api.post<AuthToken>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function register(payload: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<AuthToken> {
  const { data } = await api.post<AuthToken>("/auth/register", payload);
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
