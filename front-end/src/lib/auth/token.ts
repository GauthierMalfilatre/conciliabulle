// Signed session cookie, readable both by the proxy and by server code.
// It carries its own limits (set at sign-in from the platform settings), so the
// proxy can enforce them without a database lookup.

export const SESSION_COOKIE = "session_token";

export type SessionPayload = {
  /** JWT access token sent to the API (a few minutes; the proxy refreshes it). */
  tok: string;
  /** JWT refresh token. */
  ref: string;
  /** Issued at, expires at, last activity: epoch milliseconds. */
  iat: number;
  exp: number;
  seen: number;
  /** Inactivity limit in minutes; 0 = none. */
  idle: number;
};

// Set SESSION_SECRET in production: without it, anyone could forge a session.
// Read when signing, not at import: `next build` runs without the production secret.
function secret() {
  const value = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-change-me");
  if (!value) throw new Error("SESSION_SECRET is required in production.");
  return value;
}
const encoder = new TextEncoder();

function b64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

export async function signSession(payload: SessionPayload) {
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body)}`;
}

/** The payload if the signature is valid, whatever its dates; null otherwise. */
export async function readSession(value: string | undefined): Promise<SessionPayload | null> {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig || (await hmac(body)) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionState(p: SessionPayload, now = Date.now()): "valide" | "expiree" | "inactive" {
  if (now >= p.exp) return "expiree";
  if (p.idle > 0 && now - p.seen > p.idle * 60_000) return "inactive";
  return "valide";
}
