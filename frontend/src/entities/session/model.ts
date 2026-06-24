export type Role = "USER" | "ADMIN";

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  updated_at: string;
};
