import { addDays, startOfDay } from "./schedule";
import type { CallbackRequest, Domaine, DossierStatut, Mode, PlatformSettings } from "./types";

// Demo backend for what the API does not cover yet: conciliation cases, callback
// requests, service settings, and the conciliateur's attendance marks and notes.
// In memory, kept on globalThis so it survives dev hot reloads; it resets when the
// server restarts.

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

/** What the conciliateur adds to an API appointment. */
export type SuiviRecord = {
  presence?: "honore" | "absent";
  /** Private note, only visible to the conciliateur. */
  note?: string;
  dossierId?: string;
};

export const DEFAULT_PLATFORM: PlatformSettings = {
  sessionDureeHeures: 8,
  inactiviteMinutes: 30,
  maxEssaisCodeDossier: 5,
  maxRdvAVenir: 3,
  dureesRdvAutorisees: [30, 45, 60],
  dureeReunionMinutes: 60,
  rappelVeille: true,
  rappelJourMeme: false,
  delaiRappelJours: 2,
  numeroAide: "0 800 000 000",
  bandeau: { actif: false, message: "" },
};

/**
 * Demo cases and callbacks are not tied to a real conciliateur yet: the first
 * conciliateur who opens their workspace takes them (see claimDemo).
 */
export const DEMO_OWNER = "demo";

type DB = {
  platform: PlatformSettings;
  /** Keyed by API appointment id. */
  suivi: Map<string, SuiviRecord>;
  dossiers: DossierRecord[];
  callbacks: CallbackRequest[];
  joinAttempts: Map<string, number>;
};

// Bump when the DB shape changes: a dev server keeps the old object across hot reloads.
const DB_VERSION = 4;
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

export function suivi(appointmentId: string) {
  const all = db().suivi;
  if (!all.has(appointmentId)) all.set(appointmentId, {});
  return all.get(appointmentId)!;
}

/** Hands the demo cases and callbacks to the first conciliateur who looks at them. */
export function claimDemo(conciliateurId: string) {
  for (const d of db().dossiers) if (d.conciliateurId === DEMO_OWNER) d.conciliateurId = conciliateurId;
  for (const c of db().callbacks) if (c.conciliateurId === DEMO_OWNER) c.conciliateurId = conciliateurId;
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// --- Demo data ---------------------------------------------------------------

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function seed(): DB {
  const now = new Date();
  const today = startOfDay(now);
  const seance = (offsetDays: number, hour: number, mode: Mode, id: string): SeanceRecord => ({
    id, debut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays, hour).toISOString(),
    dureeMinutes: 60, mode,
  });

  return {
    platform: structuredClone(DEFAULT_PLATFORM),
    suivi: new Map(),
    dossiers: [
      {
        id: "d1", reference: "2026-0412", conciliateurId: DEMO_OWNER, objet: "voisinage", statut: "en_cours",
        ouvertLe: addDays(today, -20).toISOString(),
        parties: [
          { role: "A", nom: "Alice Durand", code: "CJ-4821-KQ" },
          { role: "B", nom: "Bernard Roche", code: "CJ-4821-ZT" },
        ],
        seances: [seance(-12, 10, "sur_place", "s1"), seance(9, 10, "sur_place", "s2"), seance(23, 14, "visio", "s3")],
      },
      {
        id: "d2", reference: "2026-0388", conciliateurId: DEMO_OWNER, objet: "consommation", statut: "accord",
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
        conciliateurId: DEMO_OWNER, createdAt: new Date(now.getTime() - DAY - 2 * HOUR).toISOString(),
      },
      {
        id: "cb-demo-2", nom: "Yasmina Belkacem", telephone: "07 45 12 98 30", moment: "apres-midi", motif: "logement",
        conciliateurId: DEMO_OWNER, createdAt: new Date(now.getTime() - 3 * DAY).toISOString(), traiteeLe: new Date(now.getTime() - 2 * DAY).toISOString(),
      },
    ],
    joinAttempts: new Map(),
  };
}
