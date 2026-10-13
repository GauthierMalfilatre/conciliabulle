import { request } from "./client";
import { ApiError } from "./types";

// POST candidatures: people who want to become conciliateurs leave their details
// for the association of their département. Public, 5 per hour per IP.

export type CandidatureInput = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  departement: string;
  message: string;
  consentement: boolean;
};

export type CandidatureErrors = Partial<Record<"prenom" | "nom" | "email" | "telephone" | "departement" | "consentement" | "form", string>>;

/**
 * The API limits by IP: `clientIp` is forwarded so that all visitors do not
 * share the Next server's quota.
 */
export async function createCandidature(input: CandidatureInput, clientIp?: string): Promise<CandidatureErrors | null> {
  try {
    await request("candidatures", {
      method: "POST",
      headers: clientIp ? { "X-Forwarded-For": clientIp } : undefined,
      body: {
        first_name: input.prenom,
        last_name: input.nom,
        email: input.email,
        phone: input.telephone,
        department: input.departement,
        message: input.message,
        consent: input.consentement,
      },
    });
    return null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      return { form: "Trop de demandes envoyées depuis cette connexion. Réessayez dans une heure." };
    }
    if (!(e instanceof ApiError) || e.status !== 400) throw e;
    const body = (e.body ?? {}) as Record<string, unknown>;
    const errors: CandidatureErrors = {};
    if (body.first_name) errors.prenom = "Indiquez votre prénom.";
    if (body.last_name) errors.nom = "Indiquez votre nom.";
    if (body.email) errors.email = "Cette adresse email n'est pas valide.";
    if (body.phone) errors.telephone = "Ce numéro de téléphone n'est pas valide.";
    if (body.department) errors.departement = "Choisissez votre département.";
    if (body.consent) errors.consentement = "Cochez la case pour que l'association puisse vous contacter.";
    return Object.keys(errors).length ? errors : { form: "La demande n'a pas abouti. Vérifiez vos informations." };
  }
}
