import { fakeLatency } from "@/lib/api/latency";
import type { User } from "./types";

// Fake backend: swap these functions for real `fetch` calls to the API.

/** Every demo account uses this password. */
export const FAKE_PASSWORD = "password";

const FAKE_USERS: User[] = [
  {
    id: "1",
    name: "Camille Martin",
    email: "justiciable@test.fr",
    telephone: "06 12 34 56 78",
    status: "justiciable",
  },
  {
    id: "2",
    name: "Sophie Lambert",
    email: "conciliateur@test.fr",
    telephone: "06 98 76 54 32",
    status: "conciliateur",
    conciliateurId: "m1",
  },
];

export class AuthError extends Error {}

/**
 * POST /auth/login { email, password } → { token, user }
 * The same message whether the email is unknown or the password wrong, so the
 * form can't be used to find out if someone has an account.
 */
export async function apiLogin(email: string, password: string) {
  await fakeLatency(500);
  const user = FAKE_USERS.find((u) => u.email === email.trim().toLowerCase());
  if (!user || password !== FAKE_PASSWORD) {
    throw new AuthError("Adresse email ou mot de passe incorrect.");
  }
  return { token: `fake-token-${user.id}`, user };
}

/** GET /auth/me (Authorization: Bearer <token>) → user | null */
export async function apiGetMe(token: string): Promise<User | null> {
  await fakeLatency(200);
  const id = token.replace("fake-token-", "");
  return FAKE_USERS.find((u) => u.id === id) ?? null;
}
