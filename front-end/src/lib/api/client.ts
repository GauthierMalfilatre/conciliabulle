import { ApiError } from "./types";

// Low-level client of the Django REST API (backend/). No Next.js imports, so the
// proxy can use it too. Pages and actions go through `api()` in ./http.ts.

export const API_URL = (process.env.API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** JWT access token. */
  token?: string;
  headers?: Record<string, string>;
};

export async function request<T>(path: string, { method = "GET", body, query, token, headers: extra }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiError(503, "Le service de rendez-vous ne répond pas. Réessayez dans quelques minutes.");
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, firstMessage(data), undefined, data);
  return data as T;
}

/** First readable message of a DRF error body: {"detail": …}, {"field": ["…"]} or ["…"]. */
function firstMessage(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return firstMessage(data[0]);
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    return firstMessage("detail" in o ? o.detail : Object.values(o)[0]);
  }
  return "Erreur inattendue.";
}

/** Expiry of a JWT in epoch milliseconds (read only: the API checks the signature). */
export function jwtExpiry(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { exp?: number };
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

/** POST auth/refresh → a new access token, or null once the refresh token has expired. */
export async function refreshAccess(refresh: string) {
  try {
    return (await request<{ access: string }>("auth/refresh", { method: "POST", body: { refresh } })).access;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 400)) return null;
    throw e;
  }
}
