import axios from "axios";

/**
 * Shared axios instance.
 * withCredentials: true → the browser sends the HttpOnly auth cookies automatically.
 * Tokens never touch localStorage — JavaScript cannot read or write them.
 */
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Prevents concurrent refresh calls from stacking.
let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

function notifySubscribers(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

// ── Response interceptor ───────────────────────────────────────────────────
// On 401, attempt a silent token refresh once, then retry the original request.
// If the refresh also fails the user is effectively logged out — AuthProvider
// will detect this on the next /me call and clear the React state.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // Don't intercept: non-401, already-retried requests, or auth endpoints
    if (
      error?.response?.status !== 401 ||
      original._retry ||
      original.url?.includes("/auth/")
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise((resolve, reject) => {
        refreshSubscribers.push((ok) => {
          if (ok) resolve(api(original));
          else reject(error);
        });
      });
    }

    isRefreshing = true;
    try {
      // The refresh_token cookie is scoped to this path — the browser sends it automatically
      await axios.post("/api/auth/refresh", null, { withCredentials: true });
      isRefreshing = false;
      notifySubscribers(true);
      return api(original);
    } catch {
      isRefreshing = false;
      notifySubscribers(false);
      return Promise.reject(error);
    }
  }
);

/** Extracts a human-friendly message from an axios error. */
export function apiError(error: unknown, fallback = "Ocurrió un error"): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }
  return fallback;
}
