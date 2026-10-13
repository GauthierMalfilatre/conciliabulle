"use server";

import { redirect } from "next/navigation";
import {
  cancelAppointment as apiCancel,
  createAppointment,
  rescheduleAppointment as apiReschedule,
} from "@/lib/api/appointments";
import { DOMAINES, MODES } from "@/lib/api/referentiel";
import { ApiError, type Domaine, type Mode } from "@/lib/api/types";
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
  const user = await requireClient();
  const slotId = field(formData, "creneau");
  const mode = field(formData, "mode") as Mode;
  const motif = field(formData, "motif") as Domaine | "autre";
  if (!(mode in MODES) || !(motif in DOMAINES || motif === "autre")) {
    redirect(withParams("/rendez-vous/nouveau", { creneau: slotId }));
  }

  let id: string;
  try {
    ({ id } = await createAppointment(user, { slotId, mode, motif }));
  } catch (e) {
    redirect(
      withParams("/rendez-vous/nouveau", {
        creneau: slotId,
        motif,
        mode,
        etape: "recap",
        erreur: errorCode(e),
      }),
    );
  }
  redirect(`/mes-rendez-vous/${id}?confirme=1`);
}

export async function rescheduleAppointment(formData: FormData) {
  const user = await requireClient();
  const id = field(formData, "id");
  const slotId = field(formData, "creneau");
  try {
    await apiReschedule(id, user.id, slotId);
  } catch (e) {
    redirect(withParams(`/mes-rendez-vous/${id}/modifier`, { erreur: errorCode(e) }));
  }
  redirect(`/mes-rendez-vous/${id}?modifie=1`);
}

export async function cancelAppointment(formData: FormData) {
  const user = await requireClient();
  const id = field(formData, "id");
  try {
    await apiCancel(id, user.id, field(formData, "motif-annulation") || undefined);
  } catch (e) {
    redirect(withParams(`/mes-rendez-vous/${id}`, { erreur: errorCode(e) }));
  }
  redirect(`/mes-rendez-vous/${id}?annule=1`);
}
