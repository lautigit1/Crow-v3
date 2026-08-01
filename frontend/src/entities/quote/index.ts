import { api } from "@/shared/api";

export type QuoteStatus = "Nueva" | "En revisión" | "Respondida" | "Finalizada";

export const QUOTE_STATUSES: QuoteStatus[] = ["Nueva", "En revisión", "Respondida", "Finalizada"];

/** Una alternativa cotizada: original, alternativo, usado. */
export type QuoteOption = {
  id: number;
  title: string;
  detail: string | null;
  unit_price: number;
  quantity: number;
  /** Texto libre: "3 a 5 días hábiles", "depende del importador". */
  lead_time: string | null;
  created_at: string;
};

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
  /** Cuándo se cargó la primera opción. Null mientras no se respondió. */
  answered_at: string | null;
  /** El pedido que salió de esta cotización, si se convirtió. */
  order_id: number | null;
  // Reemplaza a `admin_reply`, que estaba declarado acá pero NUNCA existió en
  // la respuesta del backend: el bloque "Respuesta del equipo" de Mis
  // cotizaciones leía `undefined` y por eso jamás se mostró. Ese agujero -- el
  // cliente sin forma de ver lo que cotizaste -- es el que este change tapa.
  options: QuoteOption[];
};

export type QuoteInput = {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  vehicle?: string | null;
  message: string;
  product_id?: number | null;
};

export type QuoteOptionInput = {
  title: string;
  detail?: string | null;
  unit_price: number;
  quantity: number;
  lead_time?: string | null;
};

/** El pedido que devuelve `convert`. Lo mínimo para poder navegar hasta él. */
export type ConvertedOrder = { id: number; user_id: number };

type QuoteList = { items: Quote[]; total: number };

/** Total de una opción: el backend guarda unitario y cantidad por separado. */
export function optionTotal(option: QuoteOption): number {
  return option.unit_price * option.quantity;
}

export const quoteApi = {
  /** Public quote (no auth). */
  create: (data: QuoteInput) => api.post<Quote>("/quotes", data).then((r) => r.data),
  /** Quote linked to the logged-in user. */
  createMine: (data: QuoteInput) => api.post<Quote>("/quotes/me", data).then((r) => r.data),
  mine: (params?: { skip?: number; limit?: number }) =>
    api.get<QuoteList>("/quotes/me", { params }).then((r) => r.data),
  listAll: () => api.get<QuoteList>("/quotes").then((r) => r.data.items),
  setStatus: (id: number, status: QuoteStatus) =>
    api.patch<Quote>(`/quotes/${id}/status`, { status }).then((r) => r.data),

  // Las tres devuelven la COTIZACIÓN completa y no la opción tocada: la ficha
  // necesita la lista actualizada y el estado -- cargar la primera opción pasa
  // la cotización a "Respondida" -- y así se evita una segunda request.
  addOption: (quoteId: number, data: QuoteOptionInput) =>
    api.post<Quote>(`/quotes/${quoteId}/options`, data).then((r) => r.data),
  updateOption: (quoteId: number, optionId: number, data: Partial<QuoteOptionInput>) =>
    api.patch<Quote>(`/quotes/${quoteId}/options/${optionId}`, data).then((r) => r.data),
  deleteOption: (quoteId: number, optionId: number) =>
    api.delete<Quote>(`/quotes/${quoteId}/options/${optionId}`).then((r) => r.data),

  /** Convierte una opción en pedido. Devuelve el PEDIDO, no la cotización. */
  convert: (quoteId: number, optionId: number) =>
    api
      .post<ConvertedOrder>(`/quotes/${quoteId}/convert`, { option_id: optionId })
      .then((r) => r.data),
};
