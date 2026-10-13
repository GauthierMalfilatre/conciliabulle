import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { platform } from "@/lib/api/store";
import { jwtExpiry } from "@/lib/api/client";
import { apiGetMe } from "./api";
import { readSession, SESSION_COOKIE, sessionState, signSession } from "./token";

export { SESSION_COOKIE };

/**
 * Opens a session with the limits set in Réglages du service. It cannot outlive
 * the API's refresh token (one day by default).
 */
export async function startSession(tokens: { access: string; refresh: string }) {
  const { sessionDureeHeures, inactiviteMinutes } = platform();
  const now = Date.now();
  const exp = Math.min(now + sessionDureeHeures * 3_600_000, jwtExpiry(tokens.refresh) || Infinity);
  const value = await signSession({
    tok: tokens.access,
    ref: tokens.refresh,
    iat: now,
    exp,
    seen: now,
    idle: inactiviteMinutes,
  });
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor((exp - now) / 1000),
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user, or null when logged out or the session has lapsed. Deduplicated per request. */
export const getCurrentUser = cache(async () => {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || sessionState(session) !== "valide") return null;
  return apiGetMe(session.tok);
});

/** Current user, redirecting to /login when logged out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Current user when they are a client (justiciable); others go home. */
export async function requireClient() {
  const user = await requireUser();
  if (user.status !== "justiciable") redirect("/");
  return user;
}

/** Current user when they are a conciliateur; others go home. */
export async function requirePro() {
  const user = await requireUser();
  if (user.status !== "conciliateur" || !user.conciliateurId) redirect("/");
  return { ...user, conciliateurId: user.conciliateurId };
}

/** Only same-site paths, so `?next=` can't send users to another site. */
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
