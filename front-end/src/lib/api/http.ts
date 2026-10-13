import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "@/lib/auth/token";
import { request, type RequestOptions } from "./client";
import { ApiError } from "./types";

// Server-side only: the JWT stays in the signed session cookie and never reaches the browser.

/** The session's access token (the proxy keeps it fresh). */
export async function accessToken() {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return session?.tok;
}

/** Authenticated call as the signed-in user; sends them to /login if the API no longer accepts the session. */
export async function api<T>(path: string, options: Omit<RequestOptions, "token"> = {}): Promise<T> {
  const token = await accessToken();
  if (!token) redirect("/login");
  try {
    return await request<T>(path, { ...options, token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login?expire=expiree");
    throw e;
  }
}

/** Like `api`, but null instead of an error on 404. */
export async function apiOrNull<T>(path: string, options: Omit<RequestOptions, "token"> = {}): Promise<T | null> {
  try {
    return await api<T>(path, options);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
