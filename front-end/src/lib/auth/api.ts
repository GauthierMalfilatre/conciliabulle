import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { User } from "./types";

// Accounts on the Django API: POST auth/login, POST auth/register, GET me.

type ApiUser = { id: number; email: string; first_name: string; last_name: string; role: "USER" | "CONCILIATEUR" };

export class AuthError extends Error {}

/**
 * POST auth/login → JWT pair. The same message whether the email is unknown or
 * the password wrong, so the form can't be used to find out if someone has an account.
 */
export async function apiLogin(email: string, password: string) {
  try {
    return await request<{ access: string; refresh: string }>("auth/login", { method: "POST", body: { email, password } });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 400)) {
      throw new AuthError("Adresse email ou mot de passe incorrect.");
    }
    throw e;
  }
}

export type RegisterInput = { email: string; password: string; prenom: string; nom: string };
export type RegisterErrors = Partial<Record<"email" | "password" | "prenom" | "nom", string>>;

// Django's messages are in English: the common ones, in plain French.
const PASSWORD_MESSAGES: [RegExp, string][] = [
  [/too short/i, "Le mot de passe doit contenir au moins 8 caractères."],
  [/too common/i, "Ce mot de passe est trop courant, choisissez-en un autre."],
  [/entirely numeric/i, "Le mot de passe ne peut pas contenir que des chiffres."],
  [/too similar/i, "Le mot de passe ressemble trop à votre nom ou à votre email."],
];

/** POST auth/register (role USER, chosen by the API) → field errors in French, or nothing. */
export async function apiRegister(input: RegisterInput): Promise<RegisterErrors | null> {
  try {
    await request("auth/register", {
      method: "POST",
      body: { email: input.email, password: input.password, first_name: input.prenom, last_name: input.nom },
    });
    return null;
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 400) throw e;
    const body = (e.body ?? {}) as Record<string, string[]>;
    const errors: RegisterErrors = {};
    if (body.email) {
      errors.email = body.email.some((m) => /exists/i.test(m))
        ? "Un compte existe déjà avec cette adresse. Connectez-vous."
        : "Cette adresse email n'est pas valide.";
    }
    if (body.password) {
      errors.password = PASSWORD_MESSAGES.find(([re]) => body.password.some((m) => re.test(m)))?.[1] ?? "Ce mot de passe n'est pas accepté.";
    }
    if (body.first_name) errors.prenom = "Indiquez votre prénom.";
    if (body.last_name) errors.nom = "Indiquez votre nom.";
    return Object.keys(errors).length ? errors : { email: "L'inscription n'a pas abouti. Vérifiez vos informations." };
  }
}

/** GET me (+ GET me/profile for a conciliateur) → user, or null if the token is refused. */
export async function apiGetMe(token: string): Promise<User | null> {
  try {
    const u = await request<ApiUser>("me", { token });
    const user: User = {
      id: String(u.id),
      name: `${u.first_name} ${u.last_name}`.trim() || u.email,
      prenom: u.first_name,
      nom: u.last_name,
      email: u.email,
      status: u.role === "CONCILIATEUR" ? "conciliateur" : "justiciable",
    };
    if (user.status === "conciliateur") {
      try {
        user.conciliateurId = String((await request<{ id: number }>("me/profile", { token })).id);
      } catch (e) {
        // A conciliateur account without a profile yet: signed in, but no workspace.
        if (!(e instanceof ApiError) || e.status === 401) throw e;
      }
    }
    return user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}
