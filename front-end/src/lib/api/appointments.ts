import { getSlot } from "./conciliateurs";
import { fakeLatency } from "./latency";
import { conciliateurById, db, newId, parametres, platform, type AppointmentRecord } from "./store";
import { ApiError, type Appointment, type ConciliateurContact, type Mode, type Motif } from "./types";

// Fake backend: swap these functions for `fetch` calls to the real API.

/** Online changes are refused less than this long before the appointment (platform setting). */
export function delaiModificationHeures() {
  return platform().delaiModificationHeures;
}

export function contactOf(conciliateurId: string): ConciliateurContact {
  const c = conciliateurById(conciliateurId)!;
  return { id: c.id, nom: c.nom, ville: c.ville, lieu: c.lieu, adresse: c.adresse, telephone: c.telephone };
}

export function finOf(r: { debut: string; dureeMinutes: number }) {
  return new Date(new Date(r.debut).getTime() + r.dureeMinutes * 60_000).toISOString();
}

function toAppointment(r: AppointmentRecord): Appointment {
  const fin = finOf(r);
  const limite = new Date(r.debut).getTime() - delaiModificationHeures() * 3_600_000;
  return {
    id: r.id,
    conciliateur: contactOf(r.conciliateurId),
    slotId: r.slotId,
    debut: r.debut,
    fin,
    mode: r.mode,
    motif: r.motif,
    statut: r.annulation ? "annule" : new Date(fin).getTime() < Date.now() ? "passe" : "confirme",
    modifiableJusquA: new Date(limite).toISOString(),
    annulation: r.annulation && { par: r.annulation.par, message: r.annulation.message },
  };
}

/** Whether the client can still change or cancel it online. */
export function isModifiable(a: Appointment) {
  return a.statut === "confirme" && Date.now() <= new Date(a.modifiableJusquA).getTime();
}

function owned(id: string, userId: string) {
  const r = db().appointments.get(id);
  if (!r || r.userId !== userId) throw new ApiError(404, "Rendez-vous introuvable.");
  return r;
}

function assertModifiable(r: AppointmentRecord) {
  if (!isModifiable(toAppointment(r))) {
    throw new ApiError(403, "Ce rendez-vous ne peut plus être modifié en ligne.");
  }
}

async function assertAvailable(slotId: string) {
  const found = await getSlot(slotId);
  if (!found) throw new ApiError(404, "Créneau introuvable.");
  if (!found.available) throw new ApiError(409, "Ce créneau vient d'être réservé.");
  return found.slot;
}

/** GET /me/appointments?scope=upcoming|past */
export async function listMyAppointments(userId: string, scope: "upcoming" | "past") {
  await fakeLatency(200);
  const all = [...db().appointments.values()]
    .filter((r) => r.userId === userId)
    .map(toAppointment)
    .sort((a, b) => a.debut.localeCompare(b.debut));
  return scope === "upcoming"
    ? all.filter((a) => a.statut === "confirme")
    : all.filter((a) => a.statut !== "confirme").reverse();
}

/** GET /appointments/:id */
export async function getAppointment(id: string, userId: string) {
  await fakeLatency(150);
  const r = db().appointments.get(id);
  return r && r.userId === userId ? toAppointment(r) : null;
}

/** POST /appointments → 409 when the slot is taken */
export async function createAppointment(
  user: { id: string; name: string; telephone: string },
  input: { slotId: string; mode: Mode; motif: Motif },
) {
  await fakeLatency(400);
  const max = platform().maxRdvAVenir;
  const upcoming = [...db().appointments.values()].filter(
    (r) => r.userId === user.id && !r.annulation && new Date(r.debut).getTime() > Date.now(),
  ).length;
  if (max > 0 && upcoming >= max) {
    throw new ApiError(409, `Vous avez déjà ${upcoming} rendez-vous à venir.`, "limite");
  }
  const slot = await assertAvailable(input.slotId);
  if (!slot.modes.includes(input.mode)) throw new ApiError(409, "Mode indisponible.");
  const record: AppointmentRecord = {
    id: newId("rdv"),
    userId: user.id,
    client: { nom: user.name, telephone: user.telephone },
    conciliateurId: slot.conciliateurId,
    slotId: slot.id,
    debut: slot.debut,
    dureeMinutes: parametres(slot.conciliateurId).dureeMinutes,
    mode: input.mode,
    motif: input.motif,
    creeLe: new Date().toISOString(),
  };
  db().appointments.set(record.id, record);
  return toAppointment(record);
}

/** PATCH /appointments/:id → 403 past the deadline, 409 when the slot is taken */
export async function rescheduleAppointment(id: string, userId: string, slotId: string) {
  await fakeLatency(400);
  const r = owned(id, userId);
  assertModifiable(r);
  const slot = await assertAvailable(slotId);
  if (slot.conciliateurId !== r.conciliateurId) throw new ApiError(409, "Créneau d'un autre conciliateur.");
  r.slotId = slot.id;
  r.debut = slot.debut;
  r.dureeMinutes = parametres(slot.conciliateurId).dureeMinutes;
  return toAppointment(r);
}

/** POST /appointments/:id/cancel → 403 past the deadline */
export async function cancelAppointment(id: string, userId: string, motif?: string) {
  await fakeLatency(400);
  const r = owned(id, userId);
  assertModifiable(r);
  r.annulation = { par: "client", message: motif, le: new Date().toISOString() };
  return toAppointment(r);
}
