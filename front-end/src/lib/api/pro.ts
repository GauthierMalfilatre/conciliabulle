import { finOf } from "./appointments";
import { toSeance } from "./dossiers";
import { fakeLatency } from "./latency";
import { addDays, startOfDay, toMinutes, ymd } from "./schedule";
import {
  conciliateurById,
  db,
  newId,
  parametres,
  platform,
  type AppointmentRecord,
  type DossierRecord,
  type ProfilPatch,
} from "./store";
import {
  ApiError,
  type Absence,
  type Domaine,
  type DossierStatut,
  type Mode,
  type Parametres,
  type ProAppointment,
  type ProDossier,
  type Weekday,
} from "./types";

// Conciliateur-side fake backend. Every function takes the conciliateur id from
// the session (never from the client) and only touches that conciliateur's data.

function toPro(r: AppointmentRecord): ProAppointment {
  const fin = finOf(r);
  const past = new Date(fin).getTime() < Date.now();
  return {
    id: r.id,
    debut: r.debut,
    fin,
    mode: r.mode,
    motif: r.motif,
    client: r.client,
    statut: r.annulation ? "annule" : r.presence ?? (past ? "a_renseigner" : "a_venir"),
    creeLe: r.creeLe,
    annulation: r.annulation && { par: r.annulation.par, message: r.annulation.message },
    note: r.note,
    dossierId: r.dossierId,
  };
}

function mine(conciliateurId: string) {
  return [...db().appointments.values()].filter((r) => r.conciliateurId === conciliateurId);
}

function ownedAppointment(conciliateurId: string, id: string) {
  const r = db().appointments.get(id);
  if (!r || r.conciliateurId !== conciliateurId) throw new ApiError(404, "Rendez-vous introuvable.");
  return r;
}

const byDate = (a: { debut: string }, b: { debut: string }) => a.debut.localeCompare(b.debut);

// --- Dashboard & diary -------------------------------------------------------

/** GET /pro/dashboard */
export async function getDashboard(conciliateurId: string) {
  await fakeLatency(200);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const in7 = addDays(today, 7);
  const all = mine(conciliateurId).map(toPro).sort(byDate);
  const active = all.filter((a) => a.statut !== "annule");
  const aujourdhui = active.filter((a) => new Date(a.debut) >= today && new Date(a.debut) < tomorrow);
  const aVenir = active.filter((a) => a.statut === "a_venir" && new Date(a.debut) >= tomorrow);
  const demandes = await listDemandes(conciliateurId);
  return {
    aujourdhui,
    prochains: aVenir.slice(0, 5),
    aRenseigner: all.filter((a) => a.statut === "a_renseigner"),
    stats: {
      semaine: active.filter((a) => new Date(a.debut) >= today && new Date(a.debut) < in7).length,
      aRenseigner: all.filter((a) => a.statut === "a_renseigner").length,
      rappels: demandes.rappels.filter((c) => !c.traiteeLe).length,
      changements: demandes.changements.length,
      dossiersEnCours: db().dossiers.filter((d) => d.conciliateurId === conciliateurId && d.statut === "en_cours").length,
    },
    reservationOuverte: conciliateurById(conciliateurId)?.reservationOuverte ?? false,
  };
}

/** GET /pro/agenda?from=&to= — `week` 0 is the current week, starting Monday. */
export async function getAgenda(conciliateurId: string, week: number) {
  await fakeLatency(200);
  const today = startOfDay(new Date());
  const monday = addDays(today, -((today.getDay() + 6) % 7) + week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const end = addDays(monday, 7);
  const appointments = mine(conciliateurId)
    .filter((r) => new Date(r.debut) >= monday && new Date(r.debut) < end)
    .map(toPro)
    .sort(byDate);
  const p = parametres(conciliateurId);
  return {
    days: days.map((d) => ({
      date: d.toISOString(),
      absence: p.absences.find((a) => a.du <= ymd(d) && ymd(d) <= a.au),
      appointments: appointments.filter((a) => ymd(new Date(a.debut)) === ymd(d)),
    })),
  };
}

/** GET /pro/appointments/:id */
export async function getProAppointment(conciliateurId: string, id: string) {
  await fakeLatency(150);
  const r = db().appointments.get(id);
  return r && r.conciliateurId === conciliateurId ? toPro(r) : null;
}

/** POST /pro/appointments/:id/presence — only once the appointment has started. */
export async function setPresence(conciliateurId: string, id: string, presence: "honore" | "absent") {
  await fakeLatency(300);
  const r = ownedAppointment(conciliateurId, id);
  if (r.annulation || new Date(r.debut).getTime() > Date.now()) {
    throw new ApiError(409, "Ce rendez-vous n'a pas encore eu lieu.");
  }
  r.presence = presence;
}

/** POST /pro/appointments/:id/cancel — the client is notified with the message. */
export async function cancelByConciliateur(conciliateurId: string, id: string, message: string) {
  await fakeLatency(300);
  const r = ownedAppointment(conciliateurId, id);
  if (r.annulation || new Date(r.debut).getTime() < Date.now()) {
    throw new ApiError(409, "Ce rendez-vous ne peut plus être annulé.");
  }
  r.annulation = { par: "conciliateur", message: message || undefined, le: new Date().toISOString() };
}

/** PUT /pro/appointments/:id/note */
export async function saveNote(conciliateurId: string, id: string, note: string) {
  await fakeLatency(200);
  ownedAppointment(conciliateurId, id).note = note || undefined;
}

// --- Settings ----------------------------------------------------------------

/** GET /pro/settings */
export async function getParametres(conciliateurId: string): Promise<Parametres> {
  await fakeLatency(150);
  return structuredClone(parametres(conciliateurId));
}

/** PUT /pro/settings — 400 when a half-day ends before it starts. */
export async function saveParametres(
  conciliateurId: string,
  input: Pick<Parametres, "horaires" | "dureeMinutes" | "delaiMinHeures" | "horizonSemaines">,
) {
  await fakeLatency(300);
  if (!platform().dureesRdvAutorisees.includes(input.dureeMinutes)) {
    throw new ApiError(400, "Cette durée de rendez-vous n'est pas proposée sur la plateforme.");
  }
  for (const d of Object.keys(input.horaires).map(Number) as Weekday[]) {
    for (const plage of [input.horaires[d].matin, input.horaires[d].apresMidi]) {
      if (plage.actif && toMinutes(plage.fin) - toMinutes(plage.debut) < input.dureeMinutes) {
        throw new ApiError(400, "Chaque plage doit durer au moins un rendez-vous, et finir après son début.");
      }
    }
  }
  Object.assign(parametres(conciliateurId), input);
}

/** PUT /pro/profile { reservationOuverte } */
export async function setReservationOuverte(conciliateurId: string, ouverte: boolean) {
  await fakeLatency(200);
  await patchProfil(conciliateurId, { reservationOuverte: ouverte });
}

/** POST /pro/absences — returns the appointments it overlaps, to deal with. */
export async function addAbsence(conciliateurId: string, input: Omit<Absence, "id">) {
  await fakeLatency(300);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.du) || !/^\d{4}-\d{2}-\d{2}$/.test(input.au) || input.au < input.du) {
    throw new ApiError(400, "La date de fin doit être après la date de début.");
  }
  const absence = { ...input, id: newId("abs") };
  parametres(conciliateurId).absences.push(absence);
  parametres(conciliateurId).absences.sort((a, b) => a.du.localeCompare(b.du));
  return absence;
}

/** DELETE /pro/absences/:id */
export async function removeAbsence(conciliateurId: string, id: string) {
  await fakeLatency(200);
  const p = parametres(conciliateurId);
  p.absences = p.absences.filter((a) => a.id !== id);
}

/** Booked appointments falling within an absence: they must be moved or cancelled. */
export function conflicts(conciliateurId: string, absence: Absence) {
  return mine(conciliateurId)
    .filter((r) => !r.annulation && absence.du <= ymd(new Date(r.debut)) && ymd(new Date(r.debut)) <= absence.au)
    .map(toPro)
    .sort(byDate);
}

// --- Public profile ----------------------------------------------------------

/** GET /pro/profile */
export async function getProfil(conciliateurId: string) {
  await fakeLatency(150);
  return conciliateurById(conciliateurId) ?? null;
}

async function patchProfil(conciliateurId: string, patch: ProfilPatch) {
  const profils = db().profils;
  profils.set(conciliateurId, { ...profils.get(conciliateurId), ...patch });
}

/** PUT /pro/profile — 400 when nothing would let clients book. */
export async function saveProfil(conciliateurId: string, patch: ProfilPatch) {
  await fakeLatency(300);
  if (patch.domaines?.length === 0) throw new ApiError(400, "Choisissez au moins un type de litige.");
  if (patch.modes?.length === 0) throw new ApiError(400, "Choisissez au moins un type de rendez-vous.");
  await patchProfil(conciliateurId, patch);
}

// --- Requests to handle ------------------------------------------------------

/** GET /pro/requests — callback requests and meeting change requests. */
export async function listDemandes(conciliateurId: string) {
  await fakeLatency(150);
  const rappels = db()
    .callbacks.filter((c) => c.conciliateurId === conciliateurId)
    .sort((a, b) => Number(Boolean(a.traiteeLe)) - Number(Boolean(b.traiteeLe)) || b.createdAt.localeCompare(a.createdAt));
  const changements = db()
    .dossiers.filter((d) => d.conciliateurId === conciliateurId)
    .flatMap((d) =>
      d.seances
        .filter((s) => s.demande && !s.demande.traiteeLe)
        .map((s) => ({
          dossierId: d.id,
          reference: d.reference,
          partie: d.parties.find((p) => p.userId === s.demande!.userId)?.nom ?? "Une partie",
          seance: toSeance(s),
          message: s.demande!.message,
          le: s.demande!.le,
        })),
    );
  return { rappels, changements };
}

/** POST /pro/callbacks/:id/done */
export async function markRappelTraite(conciliateurId: string, id: string) {
  await fakeLatency(200);
  const c = db().callbacks.find((x) => x.id === id && x.conciliateurId === conciliateurId);
  if (!c) throw new ApiError(404, "Demande introuvable.");
  c.traiteeLe = new Date().toISOString();
}

// --- Conciliation cases ------------------------------------------------------

function toProDossier(r: DossierRecord): ProDossier {
  return {
    id: r.id,
    reference: r.reference,
    objet: r.objet,
    statut: r.statut,
    ouvertLe: r.ouvertLe,
    parties: r.parties.map((p) => ({ role: p.role, nom: p.nom, code: p.code, rejoint: Boolean(p.userId) })),
    seances: r.seances
      .map((s) => ({ ...toSeance(s), demande: s.demande && { le: s.demande.le, message: s.demande.message, traiteeLe: s.demande.traiteeLe } }))
      .sort(byDate),
    rendezVousId: r.rendezVousId,
  };
}

function ownedDossier(conciliateurId: string, id: string) {
  const r = db().dossiers.find((d) => d.id === id && d.conciliateurId === conciliateurId);
  if (!r) throw new ApiError(404, "Dossier introuvable.");
  return r;
}

/** GET /pro/dossiers */
export async function listProDossiers(conciliateurId: string) {
  await fakeLatency(150);
  return db()
    .dossiers.filter((d) => d.conciliateurId === conciliateurId)
    .map(toProDossier)
    .sort((a, b) => Number(a.statut !== "en_cours") - Number(b.statut !== "en_cours") || b.ouvertLe.localeCompare(a.ouvertLe));
}

/** GET /pro/dossiers/:id */
export async function getProDossier(conciliateurId: string, id: string) {
  await fakeLatency(150);
  const r = db().dossiers.find((d) => d.id === id && d.conciliateurId === conciliateurId);
  return r ? toProDossier(r) : null;
}

function code(reference: string) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const pick = () => letters[Math.floor(Math.random() * letters.length)];
  return `CJ-${reference.slice(-4)}-${pick()}${pick()}`;
}

/**
 * POST /pro/dossiers — opened after a first appointment. Party A is that
 * appointment's client (already identified); party B joins with their code.
 */
export async function openDossier(conciliateurId: string, rendezVousId: string, autrePartie: string, objet: Domaine) {
  await fakeLatency(400);
  const rdv = ownedAppointment(conciliateurId, rendezVousId);
  if (rdv.dossierId) throw new ApiError(409, "Un dossier existe déjà pour ce rendez-vous.");
  if (!autrePartie.trim()) throw new ApiError(400, "Indiquez le nom de l'autre partie.");
  const reference = `${new Date().getFullYear()}-${String(400 + db().dossiers.length * 7).padStart(4, "0")}`;
  const dossier: DossierRecord = {
    id: newId("d"),
    reference,
    conciliateurId,
    objet,
    statut: "en_cours",
    ouvertLe: new Date().toISOString(),
    parties: [
      { role: "A", nom: rdv.client.nom, code: code(reference), userId: rdv.userId },
      { role: "B", nom: autrePartie.trim(), code: code(reference) },
    ],
    seances: [],
    rendezVousId,
  };
  db().dossiers.push(dossier);
  rdv.dossierId = dossier.id;
  return dossier.id;
}

function parseLocal(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi);
}

/** POST /pro/dossiers/:id/seances — a joint meeting, both parties are convened. */
export async function addSeance(conciliateurId: string, id: string, input: { date: string; heure: string; mode: Mode }) {
  await fakeLatency(300);
  const r = ownedDossier(conciliateurId, id);
  const debut = parseLocal(input.date, input.heure);
  if (!debut || debut.getTime() < Date.now()) throw new ApiError(400, "Choisissez une date à venir.");
  r.seances.push({ id: newId("s"), debut: debut.toISOString(), dureeMinutes: platform().dureeReunionMinutes, mode: input.mode });
}

/** PATCH /pro/dossiers/:id/seances/:seanceId — also closes a pending change request. */
export async function moveSeance(conciliateurId: string, id: string, seanceId: string, input: { date: string; heure: string }) {
  await fakeLatency(300);
  const s = ownedDossier(conciliateurId, id).seances.find((x) => x.id === seanceId);
  if (!s) throw new ApiError(404, "Réunion introuvable.");
  const debut = parseLocal(input.date, input.heure);
  if (!debut || debut.getTime() < Date.now()) throw new ApiError(400, "Choisissez une date à venir.");
  s.debut = debut.toISOString();
  if (s.demande && !s.demande.traiteeLe) s.demande.traiteeLe = new Date().toISOString();
}

/** POST /pro/dossiers/:id/close */
export async function closeDossier(conciliateurId: string, id: string, issue: Exclude<DossierStatut, "en_cours">) {
  await fakeLatency(300);
  ownedDossier(conciliateurId, id).statut = issue;
}
