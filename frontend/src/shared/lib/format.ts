/** Formats a number as Argentine pesos. Returns "Consultar" when null. */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact number, e.g. 12.500 → "$12.500" without the currency symbol spacing. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

/** Short date like "21 jun 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

/** Date + time, e.g. "21/06/2026 14:30". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
