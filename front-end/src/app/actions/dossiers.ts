"use server";

import { redirect } from "next/navigation";
import { joinDossier, requestSeanceChange } from "@/lib/api/dossiers";
import { ApiError } from "@/lib/api/types";
import { requireClient } from "@/lib/auth/session";

export type JoinState = { error?: string; code?: string };

export async function joinDossierAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const user = await requireClient();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Saisissez le code inscrit sur le document de votre conciliateur." };

  let id: string;
  try {
    ({ id } = await joinDossier(user.id, code));
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message, code };
    throw e;
  }
  redirect(`/mon-dossier/${id}?rejoint=1`);
}

export async function requestChangeAction(formData: FormData) {
  const user = await requireClient();
  const id = String(formData.get("dossier") ?? "");
  const seanceId = String(formData.get("seance") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  try {
    await requestSeanceChange(id, seanceId, user.id, message);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    redirect(`/mon-dossier/${id}?erreur=${e.status === 409 ? "deja" : "introuvable"}`);
  }
  redirect(`/mon-dossier/${id}?demande=1`);
}
