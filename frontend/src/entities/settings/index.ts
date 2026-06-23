import { api } from "@/shared/api/client";

export type SiteSettings = {
  company_name: string;
  phone_display: string;
  whatsapp_number: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  tiktok: string;
};

export const settingsApi = {
  get: () => api.get<SiteSettings>("/settings").then((r) => r.data),
  update: (data: Partial<SiteSettings>) => api.put<SiteSettings>("/settings", data).then((r) => r.data),
};
