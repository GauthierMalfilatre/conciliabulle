import { listConciliateurs, parseSlotId, type ApiSlot } from "./conciliateurs";
import { api, apiOrNull } from "./http";
import { DELAI_MODIFICATION_HEURES } from "./referentiel";
import { platform } from "./store";
import { ApiError, type Appointment, type ConciliateurContact } from "./types";

// GET/POST appointments, GET/PATCH/DELETE appointments/{id} (justiciable side).

export type ApiAppointment = {
  id: number;
  slot: ApiSlot;
  conciliateur_id: number;
  status: "BOOKED" | "CANCELLED";
  first_name: string;
  last_name: string;
  phone: string;
  motive: string;
  instructions: string;
};

export function isPast(a: { fin: string }) {
  return new Date(a.fin).getTime() < Date.now();
}

/** Directory entries by id, to name the conciliateur of each appointment. */
async function contacts(): Promise<Map<string, ConciliateurContact>> {
  const list = await listConciliateurs();
  return new Map(list.map((c) => [c.id, { id: c.id, nom: c.nom, ville: c.ville, telephone: c.telephone }]));
}

function toAppointment(a: ApiAppointment, directory: Map<string, ConciliateurContact>): Appointment {
  const conciliateurId = String(a.conciliateur_id);
  const fin = a.slot.end;
  const limite = new Date(a.slot.start).getTime() - DELAI_MODIFICATION_HEURES * 3_600_000;
  return {
    id: String(a.id),
    // A conciliateur who left the directory keeps their past appointments.
    conciliateur: directory.get(conciliateurId) ?? { id: conciliateurId, nom: "Votre conciliateur", ville: "" },
    slotId: `${conciliateurId}.${a.slot.id}`,
    debut: a.slot.start,
    fin,
    mode: "sur_place",
    lieu: a.slot.location,
    motif: a.motive,
    contact: { prenom: a.first_name, nom: a.last_name, telephone: a.phone },
    instructions: a.instructions,
    statut: a.status === "CANCELLED" ? "annule" : isPast({ fin }) ? "passe" : "confirme",
    modifiableJusquA: new Date(limite).toISOString(),
  };
}

/** Whether the client can still change or cancel it online. */
export function isModifiable(a: Appointment) {
  return a.statut === "confirme" && Date.now() <= new Date(a.modifiableJusquA).getTime();
}

/** The API's 400s, as the codes the pages know. */
function rethrow(e: unknown): never {
  if (e instanceof ApiError && e.status === 400) {
    const body = JSON.stringify(e.body ?? "");
    if (/too late/i.test(body)) throw new ApiError(403, "Ce rendez-vous ne peut plus être modifié en ligne.", "delai");
    if (/phone/i.test(body)) throw new ApiError(400, "Ce numéro de téléphone n'est pas valide.", "telephone");
    if (/slot/i.test(body)) throw new ApiError(409, "Ce créneau n'est plus disponible.", "pris");
    if (/cancelled/i.test(body)) throw new ApiError(404, "Ce rendez-vous est annulé.", "introuvable");
  }
  if (e instanceof ApiError && e.status === 409) throw new ApiError(409, "Ce créneau vient d'être réservé.", "pris");
  throw e;
}

/** GET appointments — upcoming first-to-last, or past and cancelled last-to-first. */
export async function listMyAppointments(scope: "upcoming" | "past") {
  const [data, directory] = await Promise.all([api<ApiAppointment[]>("appointments"), contacts()]);
  const all = data.map((a) => toAppointment(a, directory)).sort((a, b) => a.debut.localeCompare(b.debut));
  return scope === "upcoming"
    ? all.filter((a) => a.statut === "confirme")
    : all.filter((a) => a.statut !== "confirme").reverse();
}

/** GET appointments/{id} */
export async function getAppointment(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const [a, directory] = await Promise.all([apiOrNull<ApiAppointment>(`appointments/${id}`), contacts()]);
  return a ? toAppointment(a, directory) : null;
}

/** POST appointments → 409 when the slot is taken. The appointment limit is a demo rule (Réglages du service). */
export async function createAppointment(input: { slotId: string; prenom: string; nom: string; telephone: string }) {
  const max = platform().maxRdvAVenir;
  if (max > 0) {
    const upcoming = (await listMyAppointments("upcoming")).length;
    if (upcoming >= max) throw new ApiError(409, `Vous avez déjà ${upcoming} rendez-vous à venir.`, "limite");
  }
  const slot = parseSlotId(input.slotId);
  if (!slot) throw new ApiError(404, "Créneau introuvable.", "introuvable");
  try {
    const a = await api<ApiAppointment>("appointments", {
      method: "POST",
      body: { slot_id: slot.slotId, first_name: input.prenom, last_name: input.nom, phone: input.telephone },
    });
    return { id: String(a.id) };
  } catch (e) {
    rethrow(e);
  }
}

/** PATCH appointments/{id} { slot_id } → 403 past the deadline, 409 when the slot is taken */
export async function rescheduleAppointment(id: string, slotId: string) {
  const slot = parseSlotId(slotId);
  if (!slot) throw new ApiError(404, "Créneau introuvable.", "introuvable");
  try {
    await api(`appointments/${id}`, { method: "PATCH", body: { slot_id: slot.slotId } });
  } catch (e) {
    rethrow(e);
  }
}

/** DELETE appointments/{id} → 403 past the deadline */
export async function cancelAppointment(id: string) {
  try {
    await api(`appointments/${id}`, { method: "DELETE" });
  } catch (e) {
    rethrow(e);
  }
}
