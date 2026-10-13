"use server";

import { redirect } from "next/navigation";
import { apiLogin, AuthError } from "@/lib/auth/fake-api";
import { clearSession, safeNext, startSession } from "@/lib/auth/session";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Saisissez votre adresse email et votre mot de passe.", email };
  }

  try {
    const { token } = await apiLogin(email, password);
    await startSession(token);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message, email };
    throw e;
  }
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
