"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/types";
import { apiLogin, apiRegister, AuthError, type RegisterErrors } from "@/lib/auth/api";
import { clearSession, safeNext, startSession } from "@/lib/auth/session";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Saisissez votre adresse email et votre mot de passe.", email };
  }

  try {
    await startSession(await apiLogin(email, password));
  } catch (e) {
    if (e instanceof AuthError || e instanceof ApiError) return { error: e.message, email };
    throw e;
  }
  redirect(safeNext(formData.get("next")));
}

export type RegisterState = {
  errors?: RegisterErrors & { form?: string };
  values?: { prenom: string; nom: string; email: string };
};

/** Creates a justiciable account, then signs in. Conciliateurs are created by the association. */
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values = {
    prenom: String(formData.get("prenom") ?? "").trim(),
    nom: String(formData.get("nom") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
  };
  const password = String(formData.get("password") ?? "");
  const errors: RegisterState["errors"] = {};
  if (!values.prenom) errors.prenom = "Indiquez votre prénom.";
  if (!values.nom) errors.nom = "Indiquez votre nom.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Indiquez une adresse email, par exemple marie.dupont@exemple.fr.";
  if (password.length < 8) errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
  if (Object.keys(errors).length) return { errors, values };

  try {
    const apiErrors = await apiRegister({ ...values, password });
    if (apiErrors) return { errors: apiErrors, values };
    await startSession(await apiLogin(values.email, password));
  } catch (e) {
    if (e instanceof AuthError || e instanceof ApiError) return { errors: { form: e.message }, values };
    throw e;
  }
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
