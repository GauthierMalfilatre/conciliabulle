import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE, sessionState, signSession } from "@/lib/auth/token";

const PUBLIC_PATHS = ["/login", "/composants", "/conciliateurs", "/etre-rappele"];

/** Activity is written back at most this often, to avoid a new cookie on every request. */
const SEEN_REFRESH_MS = 60_000;

function isPublic(pathname: string) {
  return pathname === "/login" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function toLogin(request: NextRequest, reason?: string) {
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  if (reason) login.searchParams.set("expire", reason);
  return NextResponse.redirect(login);
}

// Enforces the session limits carried by the signed cookie (maximum length and
// inactivity), and records activity. Pages still verify the session themselves.
export async function proxy(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSession(raw);
  const publicPage = isPublic(request.nextUrl.pathname);

  if (!session) {
    if (publicPage) return NextResponse.next();
    const res = toLogin(request);
    if (raw) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const state = sessionState(session);
  if (state !== "valide") {
    request.cookies.delete(SESSION_COOKIE);
    const res = publicPage ? NextResponse.next({ request }) : toLogin(request, state);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const now = Date.now();
  if (now - session.seen < SEEN_REFRESH_MS) return NextResponse.next();
  const value = await signSession({ ...session, seen: now });
  request.cookies.set(SESSION_COOKIE, value);
  const res = NextResponse.next({ request });
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((session.exp - now) / 1000)),
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
