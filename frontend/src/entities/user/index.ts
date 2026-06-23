import { api } from "@/shared/api/client";
import type { Role, User } from "@/entities/session/model";

export type { User, Role };

export type UserAdminUpdate = {
  full_name?: string;
  phone?: string | null;
  role?: Role;
  is_active?: boolean;
};

type PaginatedUsers = { items: User[]; total: number };

export const userApi = {
  list: () => api.get<PaginatedUsers>("/users").then((r) => r.data.items),
  update: (id: number, data: UserAdminUpdate) => api.patch<User>(`/users/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/users/${id}`).then(() => undefined),
  // Self-service
  updateProfile: (data: { full_name?: string; phone?: string | null }) =>
    api.patch<User>("/users/me", data).then((r) => r.data),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/users/me/password", { current_password, new_password }).then(() => undefined),
};
