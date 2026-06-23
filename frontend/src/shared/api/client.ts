import axios from "axios";

const ACCESS_KEY  = "crow.token";
const REFRESH_KEY = "crow.refresh";
const ISSUED_KEY  = "crow.issued_at"; // ms timestamp of last token issue

// How often to silently refresh (ms). As long as the user acts within this
// window the session keeps rolling. Must be < ACCESS_TOKEN_EXPIRE_MINUTES.
const SLIDE_INTERVAL_MS = 10 * 60 * 1000; // 10 min

export const tokenStore = {
  get:          ()             => localStorage.getItem(ACCESS_KEY),
  set:          (t: string)   => {
    localStorage.setItem(ACCESS_KEY, t);
    localStorage.setItem(ISSUED_KEY, String(Date.now()));
  },
  getRefresh:   ()             => localStorage.getItem(REFRESH_KEY),
  setRefresh:   (t: string)   => localStorage.setItem(REFRESH_KEY, t),
  getIssuedAt:  ()             => Number(localStorage.getItem(ISSUED_KEY) ?? "0"),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ISSUED_KEY);
  },
};

/** Shared axios instance. Base URL is "/api" (Vite proxies to FastAPI in dev). */
export const api = axios.create({ baseURL: "/api" });

// Prevents concurrent refresh calls from stacking.
let refreshPromise: Promise<void> | null = null;

async function silentRefresh(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return;

  const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
    "/api/auth/refresh",
    null,
    { headers: { Authorization: `Bearer ${refreshToken}` } }
  );

  tokenStore.set(data.access_token);
  tokenStore.setRefresh(data.refresh_token);
}

// ── Request interceptor ────────────────────────────────────────────────────────
// On every outgoing request:
//   1. If a refresh is already in flight, wait for it.
//   2. Otherwise, if the token is older than SLIDE_INTERVAL_MS and a refresh
//      token exists, kick off a silent refresh and wait for it.
//   3. Attach the (possibly renewed) access token as Bearer.
api.interceptors.request.use(async (config) => {
  // Skip the refresh endpoint itself to avoid recursion.
  if (config.url?.includes("/auth/refresh")) return config;

  const needsSlide =
    tokenStore.getRefresh() &&
    Date.now() - tokenStore.getIssuedAt() > SLIDE_INTERVAL_MS;

  if (needsSlide) {
    if (!refreshPromise) {
      refreshPromise = silentRefresh().finally(() => { refreshPromise = null; });
    }
    try { await refreshPromise; } catch { tokenStore.clear(); }
  }

  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor ───────────────────────────────────────────────────────
// On 401, clear stale tokens so the app returns to a logged-out state.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) tokenStore.clear();
    return Promise.reject(error);
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
