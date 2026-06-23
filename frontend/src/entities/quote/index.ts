import { api } from "@/shared/api/client";

export type QuoteStatus = "Nueva" | "En revisión" | "Respondida" | "Finalizada";

export const QUOTE_STATUSES: QuoteStatus[] = ["Nueva", "En revisión", "Respondida", "Finalizada"];

export type Quote = {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  vehicle: string | null;
  message: string;
  status: QuoteStatus;
  user_id: number | null;
  product_id: number | null;
  created_at: string;
};

export type QuoteInput = {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  vehicle?: string | null;
  message: string;
  product_id?: number | null;
};

type QuoteList = { items: Quote[]; total: number };

export const quoteApi = {
  /** Public quote (no auth). */
  create: (data: QuoteInput) => api.post<Quote>("/quotes", data).then((r) => r.data),
  /** Quote linked to the logged-in user. */
  createMine: (data: QuoteInput) => api.post<Quote>("/quotes/me", data).then((r) => r.data),
  mine: () => api.get<Quote[]>("/quotes/me").then((r) => r.data),
  listAll: () => api.get<QuoteList>("/quotes").then((r) => r.data.items),
  setStatus: (id: number, status: QuoteStatus) =>
    api.patch<Quote>(`/quotes/${id}/status`, { status }).then((r) => r.data),
};
