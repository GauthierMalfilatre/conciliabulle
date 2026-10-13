import { isPast, type ApiAppointment } from "./appointments";
import { type ApiSlot } from "./conciliateurs";
import { toSeance } from "./dossiers";
import { api } from "./http";
import { fakeLatency } from "./latency";
import { addDays, hhmm, startOfDay, toMinutes, ymd } from "./schedule";
import { claimDemo, db, newId, platform, suivi, type DossierRecord } from "./store";
import {
  ApiError,
  type Domaine,
  type DossierStatut,
  type Horaires,
  type Mode,
  type Parametres,
  type ProAppointment,
  type ProDossier,
  type Weekday,
} from "./types";

// Conciliateur side. Appointments, office hours, slots, profile, notifications and
// the calendar feed come from the API (me/…, scoped to the signed-in conciliateur).
// Attendance, notes, cases and callback requests are a demo backend for now.

type ApiMySlot = ApiSlot & { is_booked: boolean };
type ApiAvailability = {
  id: number;
  /** 0 = Monday. */
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  location: string;
};
type ApiProfile = { id: number; city: string; department: string; bio: string; instructions: string; is_verified: boolean };
type ApiNotification = {
  id: number;
  kind: "APPOINTMENT_BOOKED" | "APPOINTMENT_UPDATED" | "APPOINTMENT_CANCELLED";
  message: string;
  appointment_id: number | null;
  created_at: string;
  read_at: string | null;
};

function toPro(a: ApiAppointment): ProAppointment {
  const id = String(a.id);
  const s = suivi(id);
  const fin = a.slot.end;
  return {
    id,
    debut: a.slot.start,
    fin,
    mode: "sur_place",
    lieu: a.slot.location,
    motif: a.motive,
    client: { nom: `${a.first_name} ${a.last_name}`.trim(), telephone: a.phone },
    statut: a.status === "CANCELLED" ? "annule" : s.presence ?? (isPast({ fin }) ? "a_renseigner" : "a_venir"),
    note: s.note,
    dossierId: s.dossierId,
  };
}

const byDate = (a: { debut: string }, b: { debut: string }) => a.debut.localeCompare(b.debut);

/** GET me/appointments */
async function myAppointments() {
  return (await api<ApiAppointment[]>("me/appointments")).map(toPro).sort(byDate);
}

// --- Dashboard & diary -------------------------------------------------------

export async function getDashboard(conciliateurId: string) {
  claimDemo(conciliateurId);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const in7 = addDays(today, 7);
  const [all, notifications, demandes] = await Promise.all([myAppointments(), listNotifications(), listDemandes(conciliateurId)]);
  const active = all.filter((a) => a.statut !== "annule");
  const aujourdhui = active.filter((a) => new Date(a.debut) >= today && new Date(a.debut) < tomorrow);
  const aVenir = active.filter((a) => a.statut === "a_venir" && new Date(a.debut) >= tomorrow);
  return {
    aujourdhui,
    prochains: aVenir.slice(0, 5),
    aRenseigner: all.filter((a) => a.statut === "a_renseigner"),
    notifications: notifications.filter((n) => !n.lu).slice(0, 5),
    stats: {
      semaine: active.filter((a) => new Date(a.debut) >= today && new Date(a.debut) < in7).length,
      aRenseigner: all.filter((a) => a.statut === "a_renseigner").length,
      rappels: demandes.rappels.filter((c) => !c.traiteeLe).length,
      changements: demandes.changements.length,
      dossiersEnCours: db().dossiers.filter((d) => d.conciliateurId === conciliateurId && d.statut === "en_cours").length,
    },
  };
}

/** `week` 0 is the current week, starting Monday: appointments and free slots of each day. */
export async function getAgenda(week: number) {
  const today = startOfDay(new Date());
  const monday = addDays(today, -((today.getDay() + 6) % 7) + week * 7);
  const end = addDays(monday, 7);
  const [appointments, slots] = await Promise.all([
    myAppointments(),
    api<ApiMySlot[]>("me/slots", { query: { from: monday.toISOString(), to: end.toISOString() } }),
  ]);
  const inWeek = appointments.filter((a) => new Date(a.debut) >= monday && new Date(a.debut) < end);
  return {
    days: Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((d) => ({
      date: d.toISOString(),
      appointments: inWeek.filter((a) => ymd(new Date(a.debut)) === ymd(d)),
      libres: slots.filter((s) => !s.is_booked && ymd(new Date(s.start)) === ymd(d)).length,
    })),
  };
}

export async function getProAppointment(id: string) {
  return (await myAppointments()).find((a) => a.id === id) ?? null;
}

async function ownedAppointment(id: string) {
  const a = await getProAppointment(id);
  if (!a) throw new ApiError(404, "Rendez-vous introuvable.");
  return a;
}

/** Demo: attendance, only once the appointment has started. */
export async function setPresence(id: string, presence: "honore" | "absent") {
  const a = await ownedAppointment(id);
  if (a.statut === "annule" || new Date(a.debut).getTime() > Date.now()) {
    throw new ApiError(409, "Ce rendez-vous n'a pas encore eu lieu.");
  }
  suivi(id).presence = presence;
}

/** Demo: private note. */
export async function saveNote(id: string, note: string) {
  await ownedAppointment(id);
  suivi(id).note = note || undefined;
}

// --- Notifications & calendar feed ----------------------------------------------

/** GET me/notifications — alerts when an appointment is booked, changed or cancelled. */
export async function listNotifications() {
  const data = await api<ApiNotification[]>("me/notifications");
  return data.map((n) => ({
    id: String(n.id),
    type: n.kind === "APPOINTMENT_BOOKED" ? "nouveau" : n.kind === "APPOINTMENT_CANCELLED" ? "annule" : "modifie",
    message: n.message,
    rendezVousId: n.appointment_id === null ? undefined : String(n.appointment_id),
    le: n.created_at,
    lu: n.read_at !== null,
  }));
}

/** POST me/notifications/read-all */
export async function markNotificationsRead() {
  await api("me/notifications/read-all", { method: "POST" });
}

/** GET me/calendar → private URL to subscribe to from Google Agenda, Outlook… */
export async function getCalendarLink() {
  return (await api<{ url: string }>("me/calendar")).url;
}

/** POST me/calendar → a new URL; the old one stops working. */
export async function renewCalendarLink() {
  return (await api<{ url: string }>("me/calendar", { method: "POST" })).url;
}

// --- Office hours (recurring availabilities) ------------------------------------

/** Rules starting before this time are morning ones. */
const MIDI = 13 * 60;

const emptyHoraires = (): Horaires =>
  Object.fromEntries(
    ([1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => [
      d,
      { matin: { actif: false, debut: "09:00", fin: "12:00" }, apresMidi: { actif: false, debut: "14:00", fin: "17:00" } },
    ]),
  ) as unknown as Horaires;

/** GET me/availabilities, as half-days from Monday to Saturday. */
export async function getParametres(): Promise<Parametres> {
  const rules = await api<ApiAvailability[]>("me/availabilities");
  const horaires = emptyHoraires();
  for (const r of rules) {
    if (r.weekday > 5) continue;
    const debut = r.start_time.slice(0, 5);
    const day = horaires[(r.weekday + 1) as Weekday];
    day[toMinutes(debut) < MIDI ? "matin" : "apresMidi"] = { actif: true, debut, fin: r.end_time.slice(0, 5) };
  }
  return {
    horaires,
    dureeMinutes: rules[0]?.slot_minutes ?? platform().dureesRdvAutorisees[0],
    lieu: rules[0]?.location ?? "",
  };
}

/**
 * Saves the half-days as recurring availabilities: rules that changed are
 * replaced, the others are left alone. Deleting a rule removes its future free
 * slots; booked appointments are kept. Sunday rules are not touched.
 */
export async function saveParametres(input: Parametres) {
  if (!platform().dureesRdvAutorisees.includes(input.dureeMinutes)) {
    throw new ApiError(400, "Cette durée de rendez-vous n'est pas proposée sur la plateforme.");
  }
  if (!input.lieu.trim()) throw new ApiError(400, "Indiquez le lieu des rendez-vous.");
  const wanted: Omit<ApiAvailability, "id">[] = [];
  for (const d of [1, 2, 3, 4, 5, 6] as Weekday[]) {
    for (const plage of [input.horaires[d].matin, input.horaires[d].apresMidi]) {
      if (!plage.actif) continue;
      if (toMinutes(plage.fin) - toMinutes(plage.debut) < input.dureeMinutes) {
        throw new ApiError(400, "Chaque plage doit durer au moins un rendez-vous, et finir après son début.");
      }
      wanted.push({ weekday: d - 1, start_time: plage.debut, end_time: plage.fin, slot_minutes: input.dureeMinutes, location: input.lieu.trim() });
    }
  }
  const key = (r: Omit<ApiAvailability, "id">) =>
    [r.weekday, r.start_time.slice(0, 5), r.end_time.slice(0, 5), r.slot_minutes, r.location].join("|");
  const existing = (await api<ApiAvailability[]>("me/availabilities")).filter((r) => r.weekday <= 5);
  const keep = new Set(wanted.map(key));
  const have = new Set(existing.map(key));
  for (const r of existing.filter((r) => !keep.has(key(r)))) {
    await api(`me/availabilities/${r.id}`, { method: "DELETE" });
  }
  for (const r of wanted.filter((r) => !have.has(key(r)))) {
    await api("me/availabilities", { method: "POST", body: r });
  }
}

/**
 * Closes a period (holidays, illness…): its free slots are deleted. Booked
 * appointments stay; they are returned so the conciliateur can call the people.
 */
export async function closePeriod(du: string, au: string) {
  const date = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : null);
  const from = date(du);
  const to = date(au);
  if (!from || !to || to < from) throw new ApiError(400, "La date de fin doit être après la date de début.");
  const slots = await api<ApiMySlot[]>("me/slots", {
    query: { from: (from < new Date() ? new Date() : from).toISOString(), to: addDays(to, 1).toISOString() },
  });
  let retires = 0;
  for (const s of slots.filter((x) => !x.is_booked)) {
    try {
      await api(`me/slots/${s.id}`, { method: "DELETE" });
      retires++;
    } catch (e) {
      // 409: a cancelled appointment still points to it; it stays, but nobody can book it twice.
      if (!(e instanceof ApiError) || e.status !== 409) throw e;
    }
  }
  return { retires, reserves: slots.filter((x) => x.is_booked).length };
}

/** Upcoming days with at least one free slot, to show what is open. */
export async function nextOpenDays(count = 10) {
  const slots = await api<ApiMySlot[]>("me/slots", { query: { from: new Date().toISOString() } });
  const days = new Map<string, { date: string; libres: number; premier: string; dernier: string }>();
  for (const s of slots.filter((x) => !x.is_booked)) {
    const k = ymd(new Date(s.start));
    const d = days.get(k);
    if (d) {
      d.libres++;
      d.dernier = hhmm(new Date(s.end));
    } else {
      days.set(k, { date: s.start, libres: 1, premier: hhmm(new Date(s.start)), dernier: hhmm(new Date(s.end)) });
    }
  }
  return [...days.values()].slice(0, count);
}

// --- Public profile ----------------------------------------------------------

/** GET me/profile */
export async function getProfil() {
  const p = await api<ApiProfile>("me/profile");
  return { id: String(p.id), ville: p.city, departement: p.department, presentation: p.bio, instructions: p.instructions, verifie: p.is_verified };
}

/** PATCH me/profile */
export async function saveProfil(patch: { ville: string; departement: string; presentation: string; instructions: string }) {
  if (!patch.ville) throw new ApiError(400, "Indiquez votre ville.");
  try {
    await api("me/profile", {
      method: "PATCH",
      body: { city: patch.ville, department: patch.departement, bio: patch.presentation, instructions: patch.instructions },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      throw new ApiError(400, /department/.test(JSON.stringify(e.body)) ? "Ce numéro de département n'existe pas." : "Vérifiez les informations saisies.");
    }
    throw e;
  }
}

// --- Requests to handle (demo) -----------------------------------------------

/** GET /pro/requests — callback requests and meeting change requests. */
export async function listDemandes(conciliateurId: string) {
  await fakeLatency(150);
  claimDemo(conciliateurId);
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

// --- Conciliation cases (demo) -----------------------------------------------

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
  claimDemo(conciliateurId);
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
  const rdv = await ownedAppointment(rendezVousId);
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
      // The API does not say which account booked: party A joins with their code too.
      { role: "A", nom: rdv.client.nom, code: code(reference) },
      { role: "B", nom: autrePartie.trim(), code: code(reference) },
    ],
    seances: [],
    rendezVousId,
  };
  db().dossiers.push(dossier);
  suivi(rendezVousId).dossierId = dossier.id;
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
