"use server";

import { redirect } from "next/navigation";
import {
  cancelAppointment as apiCancel,
  createAppointment,
  rescheduleAppointment as apiReschedule,
} from "@/lib/api/appointments";
import { ApiError } from "@/lib/api/types";
import { normalizePhone } from "@/lib/phone";
import { requireClient } from "@/lib/auth/session";
import { withParams } from "@/lib/search-params";

// Each action re-checks the session: never trust the client for authorization.
// Errors are reported through the URL so pages work without JavaScript.

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function errorCode(e: unknown) {
  if (!(e instanceof ApiError)) throw e;
  return e.code ?? (e.status === 409 ? "pris" : e.status === 403 ? "delai" : "introuvable");
}

export async function bookAppointment(formData: FormData) {
  await requireClient();
  const slotId = field(formData, "creneau");
  const contact = { prenom: field(formData, "prenom"), nom: field(formData, "nom"), telephone: field(formData, "telephone") };
  // The phone number is not put back in the URL (browser history): it is typed again.
  const back = (erreur: string) =>
    withParams("/rendez-vous/nouveau", { creneau: slotId, erreur, prenom: contact.prenom, nom: contact.nom });

  const phone = normalizePhone(contact.telephone);
  if (!contact.prenom || !contact.nom || !phone) redirect(back("coordonnees"));

  let id: string;
  try {
    ({ id } = await createAppointment({
      slotId,
      prenom: contact.prenom,
      nom: contact.nom,
      telephone: phone.replace(/(\d{2})(?=\d)/g, "$1 "),
    }));
  } catch (e) {
    redirect(back(errorCode(e)));
  }
  redirect(`/mes-rendez-vous/${id}?confirme=1`);
}

export async function rescheduleAppointment(formData: FormData) {
  await requireClient();
  const id = field(formData, "id");
  const slotId = field(formData, "creneau");
  try {
    await apiReschedule(id, slotId);
  } catch (e) {
    redirect(withParams(`/mes-rendez-vous/${id}/modifier`, { erreur: errorCode(e) }));
  }
  redirect(`/mes-rendez-vous/${id}?modifie=1`);
}

export async function cancelAppointment(formData: FormData) {
  await requireClient();
  const id = field(formData, "id");
  try {
    await apiCancel(id);
  } catch (e) {
    redirect(withParams(`/mes-rendez-vous/${id}`, { erreur: errorCode(e) }));
  }
  redirect(`/mes-rendez-vous/${id}?annule=1`);
}
