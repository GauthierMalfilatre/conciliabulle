"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCandidature, type CandidatureErrors } from "@/lib/api/candidatures";
import { normalizePhone } from "@/lib/phone";

export type CandidatureState = {
  errors?: CandidatureErrors;
  values?: { prenom: string; nom: string; email: string; telephone: string; departement: string; message: string };
};

export async function sendCandidature(_prev: CandidatureState, formData: FormData): Promise<CandidatureState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const values = {
    prenom: text("prenom"),
    nom: text("nom"),
    email: text("email"),
    telephone: text("telephone"),
    departement: text("departement"),
    message: text("message"),
  };
  const consentement = formData.get("consentement") === "on";
  const errors: CandidatureErrors = {};
  if (!values.prenom) errors.prenom = "Indiquez votre prénom.";
  if (!values.nom) errors.nom = "Indiquez votre nom.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Indiquez une adresse email, par exemple marie.dupont@exemple.fr.";
  const phone = normalizePhone(values.telephone);
  if (!phone) errors.telephone = "Ce numéro doit comporter 10 chiffres, par exemple 06 12 34 56 78.";
  if (!values.departement) errors.departement = "Choisissez votre département.";
  if (!consentement) errors.consentement = "Cochez la case pour que l'association puisse vous contacter.";
  if (Object.keys(errors).length) return { errors, values };

  const clientIp = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const apiErrors = await createCandidature(
    { ...values, telephone: phone!.replace(/(\d{2})(?=\d)/g, "$1 "), consentement },
    clientIp,
  );
  if (apiErrors) return { errors: apiErrors, values };
  redirect("/devenir-conciliateur?envoye=1");
}
