"use server";

import { redirect } from "next/navigation";
import { createCallbackRequest } from "@/lib/api/callbacks";
import { conciliateurById } from "@/lib/api/store";
import { DOMAINES, MOMENTS, type Moment } from "@/lib/api/referentiel";
import type { Domaine } from "@/lib/api/types";
import { normalizePhone } from "@/lib/phone";
import { getCurrentUser } from "@/lib/auth/session";

export type CallbackState = {
  errors?: Partial<Record<"nom" | "telephone", string>>;
  values?: { nom: string; telephone: string; moment: string; motif: string };
};

export async function requestCallback(_prev: CallbackState, formData: FormData): Promise<CallbackState> {
  const values = {
    nom: String(formData.get("nom") ?? "").trim(),
    telephone: String(formData.get("telephone") ?? "").trim(),
    moment: String(formData.get("moment") ?? "indifferent"),
    motif: String(formData.get("motif") ?? ""),
  };
  const conciliateur = String(formData.get("conciliateur") ?? "");

  const errors: CallbackState["errors"] = {};
  if (!values.nom) errors.nom = "Indiquez votre nom pour que le conseiller sache qui appeler.";
  const phone = normalizePhone(values.telephone);
  if (!phone) errors.telephone = "Ce numéro doit comporter 10 chiffres, par exemple 06 12 34 56 78.";
  if (Object.keys(errors).length > 0) return { errors, values };

  const user = await getCurrentUser();
  await createCallbackRequest({
    nom: values.nom,
    telephone: phone!,
    moment: (values.moment in MOMENTS ? values.moment : "indifferent") as Moment,
    motif: values.motif in DOMAINES ? (values.motif as Domaine) : undefined,
    conciliateurId: conciliateurById(conciliateur) ? conciliateur : undefined,
    userId: user?.id,
  });
  redirect(`/etre-rappele/merci?moment=${values.moment}`);
}
