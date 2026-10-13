import { BASE_CONCILIATEURS, defaultParametres } from "./fake-data";
import { addDays, dayStarts, slotId, startOfDay } from "./schedule";
import type {
  CallbackRequest,
  Conciliateur,
  Domaine,
  DossierStatut,
  Mode,
  Motif,
  Parametres,
  PlatformSettings,
} from "./types";

// In-memory "database", kept on globalThis so it survives dev hot reloads.
// It resets when the server restarts.

export type AppointmentRecord = {
  id: string;
  userId: string;
  client: { nom: string; telephone: string };
  conciliateurId: string;
  slotId: string;
  /** ISO 8601 */
  debut: string;
  dureeMinutes: number;
  mode: Mode;
  motif: Motif;
  creeLe: string;
  annulation?: { par: "client" | "conciliateur"; message?: string; le: string };
  presence?: "honore" | "absent";
  /** Private note, only visible to the conciliateur. */
  note?: string;
  dossierId?: string;
};

export type SeanceRecord = {
  id: string;
  debut: string;
  dureeMinutes: number;
  mode: Mode;
  demande?: { le: string; message: string; userId: string; traiteeLe?: string };
};

export type DossierRecord = {
  id: string;
  reference: string;
  conciliateurId: string;
  objet: Domaine;
  statut: DossierStatut;
  ouvertLe: string;
  /** Each party has their own code; `userId` is set once they joined online. */
  parties: { role: "A" | "B"; nom: string; code: string; userId?: string }[];
  seances: SeanceRecord[];
  rendezVousId?: string;
};

export type ProfilPatch = Partial<
  Pick<
    Conciliateur,
    "presentation" | "lieu" | "adresse" | "telephone" | "langues" | "accesPMR" | "domaines" | "modes" | "reservationOuverte"
  >
>;

export const DEFAULT_PLATFORM: PlatformSettings = {
  sessionDureeHeures: 8,
  inactiviteMinutes: 30,
  maxEssaisCodeDossier: 5,
  delaiModificationHeures: 24,
  maxRdvAVenir: 3,
  dureesRdvAutorisees: [30, 45, 60],
  dureeReunionMinutes: 60,
  rappelVeille: true,
  rappelJourMeme: false,
  delaiRappelJours: 2,
  numeroAide: "0 800 000 000",
  bandeau: { actif: false, message: "" },
};

type DB = {
  platform: PlatformSettings;
  parametres: Map<string, Parametres>;
  profils: Map<string, ProfilPatch>;
  appointments: Map<string, AppointmentRecord>;
  dossiers: DossierRecord[];
  callbacks: CallbackRequest[];
  joinAttempts: Map<string, number>;
};

// Bump when the DB shape changes: a dev server keeps the old object across hot reloads.
const DB_VERSION = 3;
const g = globalThis as unknown as { __db?: DB; __dbVersion?: number };

export function db(): DB {
  if (!g.__db || g.__dbVersion !== DB_VERSION) {
    g.__db = seed();
    g.__dbVersion = DB_VERSION;
  }
  return g.__db;
}

/** Service-wide settings, edited from Paramètres › Réglages du service. */
export function platform() {
  return db().platform;
}

export function parametres(conciliateurId: string) {
  const all = db().parametres;
  if (!all.has(conciliateurId)) all.set(conciliateurId, defaultParametres(conciliateurId));
  return all.get(conciliateurId)!;
}

export function conciliateurById(id: string): Conciliateur | undefined {
  const base = BASE_CONCILIATEURS.find((c) => c.id === id);
  return base && { ...base, ...db().profils.get(id) };
}

export function allConciliateurs(): Conciliateur[] {
  return BASE_CONCILIATEURS.map((c) => ({ ...c, ...db().profils.get(c.id) }));
}

export function bookedSlotIds() {
  return new Set([...db().appointments.values()].filter((r) => !r.annulation).map((r) => r.slotId));
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// --- Demo data ---------------------------------------------------------------

const CLIENTS = [
  ["Jeanne Petit", "06 41 22 18 90"],
  ["Marc Dupuis", "06 72 15 33 08"],
  ["Lucie Morel", "07 61 48 02 77"],
  ["Ahmed Kaci", "06 03 98 54 21"],
  ["Paul Girard", "06 88 10 47 63"],
  ["Nadia Haddad", "07 52 36 91 14"],
  ["Robert Lemoine", "06 14 77 25 39"],
  ["Chantal Roux", "06 95 02 63 48"],
  ["Kévin Martin", "07 81 40 56 12"],
  ["Monique Blanc", "06 26 84 70 05"],
] as const;
const MOTIFS: Motif[] = ["voisinage", "logement", "consommation", "impayes", "travaux", "voisinage"];
const MODES_CYCLE: Mode[] = ["sur_place", "sur_place", "telephone", "sur_place", "visio"];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function at(day: Date, hhmm: string) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(hhmm.slice(0, 2)), Number(hhmm.slice(2)));
}

function seed(): DB {
  const now = new Date();
  const today = startOfDay(now);
  const params = new Map<string, Parametres>();
  const p1 = defaultParametres("m1");
  params.set("m1", p1);

  const appointments = new Map<string, AppointmentRecord>();
  const add = (r: Omit<AppointmentRecord, "creeLe" | "dureeMinutes"> & { dureeMinutes?: number }) =>
    appointments.set(r.id, { dureeMinutes: 45, creeLe: new Date(new Date(r.debut).getTime() - 6 * DAY - 3 * HOUR).toISOString(), ...r });

  // The demo client's own appointments.
  const firstFrom = (offset: number, cid: string, p: Parametres) => {
    for (let i = offset; i < offset + 21; i++) {
      const day = addDays(today, i);
      const starts = dayStarts(p, day);
      if (starts.length) return { day, hhmm: starts[Math.min(2, starts.length - 1)] };
    }
    return { day: addDays(today, offset), hhmm: "1000" };
  };
  const mine = firstFrom(5, "m1", p1);
  add({
    id: "rdv-1", userId: "1", client: { nom: "Camille Martin", telephone: "06 12 34 56 78" },
    conciliateurId: "m1", slotId: slotId("m1", mine.day, mine.hhmm), debut: at(mine.day, mine.hhmm).toISOString(),
    mode: "sur_place", motif: "voisinage",
  });
  const p2 = defaultParametres("m2");
  const past = firstFrom(-20, "m2", p2);
  add({
    id: "rdv-2", userId: "1", client: { nom: "Camille Martin", telephone: "06 12 34 56 78" },
    conciliateurId: "m2", slotId: slotId("m2", past.day, past.hhmm), debut: at(past.day, past.hhmm).toISOString(),
    mode: "telephone", motif: "logement", presence: "honore",
  });

  // A busy diary for the demo conciliateur (m1): today, the past week, the next two weeks.
  let k = 0;
  const client = () => CLIENTS[k % CLIENTS.length];
  const book = (day: Date, hhmm: string, extra: Partial<AppointmentRecord> = {}) => {
    const [nom, telephone] = client();
    add({
      id: `rdv-m1-${k}`, userId: `client-${k}`, client: { nom, telephone },
      conciliateurId: "m1", slotId: slotId("m1", day, hhmm), debut: at(day, hhmm).toISOString(),
      mode: MODES_CYCLE[k % MODES_CYCLE.length], motif: MOTIFS[k % MOTIFS.length], ...extra,
    });
    k++;
  };
  for (const hhmm of ["0930", "1100", "1430", "1600"]) book(today, hhmm);
  for (let i = -7; i < 0; i++) {
    const day = addDays(today, i);
    dayStarts(p1, day).filter((_, j) => j % 3 === 0).forEach((hhmm, j) =>
      book(day, hhmm, { presence: j === 1 ? "absent" : i > -3 && j === 0 ? undefined : "honore" }),
    );
  }
  for (let i = 1; i <= 14; i++) {
    const day = addDays(today, i);
    dayStarts(p1, day).filter((_, j) => j % 3 === 1).forEach((hhmm) => {
      if (slotId("m1", day, hhmm) !== appointments.get("rdv-1")!.slotId) book(day, hhmm);
    });
  }
  // One appointment cancelled by its client, to show the history.
  const cancelled = [...appointments.values()].find((r) => r.id.startsWith("rdv-m1") && new Date(r.debut) > now);
  if (cancelled) cancelled.annulation = { par: "client", message: "Le problème s'est réglé", le: now.toISOString() };

  const seance = (offsetDays: number, hour: number, mode: Mode, id: string): SeanceRecord => ({
    id, debut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays, hour).toISOString(),
    dureeMinutes: 60, mode,
  });

  return {
    platform: structuredClone(DEFAULT_PLATFORM),
    parametres: params,
    profils: new Map(),
    appointments,
    dossiers: [
      {
        id: "d1", reference: "2026-0412", conciliateurId: "m1", objet: "voisinage", statut: "en_cours",
        ouvertLe: addDays(today, -20).toISOString(),
        parties: [
          { role: "A", nom: "Camille Martin", code: "CJ-4821-KQ" },
          { role: "B", nom: "Bernard Roche", code: "CJ-4821-ZT" },
        ],
        seances: [seance(-12, 10, "sur_place", "s1"), seance(9, 10, "sur_place", "s2"), seance(23, 14, "visio", "s3")],
      },
      {
        id: "d2", reference: "2026-0388", conciliateurId: "m1", objet: "consommation", statut: "accord",
        ouvertLe: addDays(today, -45).toISOString(),
        parties: [
          { role: "A", nom: "Lucie Morel", code: "CJ-3907-AB" },
          { role: "B", nom: "Garage du Centre", code: "CJ-3907-CD" },
        ],
        seances: [seance(-30, 14, "sur_place", "s1")],
      },
    ],
    callbacks: [
      {
        id: "cb-demo-1", nom: "Gérard Fontaine", telephone: "06 22 33 44 55", moment: "matin", motif: "voisinage",
        conciliateurId: "m1", createdAt: new Date(now.getTime() - DAY - 2 * HOUR).toISOString(),
      },
      {
        id: "cb-demo-2", nom: "Yasmina Belkacem", telephone: "07 45 12 98 30", moment: "apres-midi", motif: "logement",
        conciliateurId: "m1", createdAt: new Date(now.getTime() - 3 * DAY).toISOString(), traiteeLe: new Date(now.getTime() - 2 * DAY).toISOString(),
      },
    ],
    joinAttempts: new Map(),
  };
}
