import { contactOf, finOf } from "./appointments";
import { fakeLatency } from "./latency";
import { db, platform, type DossierRecord, type SeanceRecord } from "./store";
import { ApiError, type Dossier, type Seance } from "./types";

// Fake backend: swap these functions for `fetch` calls to the real API.

/** The demo code a conciliateur would hand to the client, on paper or by letter. */
export const DEMO_DOSSIER_CODE = "CJ-4821-KQ";

export function toSeance(s: SeanceRecord): Seance {
  const fin = finOf(s);
  return {
    id: s.id,
    debut: s.debut,
    fin,
    mode: s.mode,
    statut: new Date(fin).getTime() < Date.now() ? "passee" : "prevue",
    changementDemandeLe: s.demande && !s.demande.traiteeLe ? s.demande.le : undefined,
  };
}

function toDossier(r: DossierRecord): Dossier {
  return {
    id: r.id,
    reference: r.reference,
    conciliateur: contactOf(r.conciliateurId),
    objet: r.objet,
    statut: r.statut,
    seances: r.seances.map(toSeance).sort((a, b) => a.debut.localeCompare(b.debut)),
  };
}

export function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const isMember = (r: DossierRecord, userId: string) => r.parties.some((p) => p.userId === userId);

/**
 * POST /dossiers/join { code } — the code is a second factor on top of the
 * login: an account alone is not enough to reach someone's case.
 */
export async function joinDossier(userId: string, code: string) {
  await fakeLatency(400);
  const attempts = db().joinAttempts;
  const tries = attempts.get(userId) ?? 0;
  if (tries >= platform().maxEssaisCodeDossier) {
    throw new ApiError(403, "Trop d'essais. Contactez votre conciliateur pour vérifier votre code.");
  }
  const wanted = normalizeCode(code);
  for (const r of db().dossiers) {
    const partie = r.parties.find((p) => normalizeCode(p.code) === wanted);
    if (partie && (!partie.userId || partie.userId === userId)) {
      attempts.delete(userId);
      partie.userId = userId;
      return toDossier(r);
    }
  }
  attempts.set(userId, tries + 1);
  throw new ApiError(404, "Ce code ne correspond à aucun dossier. Vérifiez-le sur le document remis par votre conciliateur.");
}

/** GET /me/dossiers */
export async function listMyDossiers(userId: string) {
  await fakeLatency(200);
  return db().dossiers.filter((r) => isMember(r, userId)).map(toDossier);
}

/** GET /dossiers/:id */
export async function getDossier(id: string, userId: string) {
  await fakeLatency(150);
  const r = db().dossiers.find((x) => x.id === id);
  return r && isMember(r, userId) ? toDossier(r) : null;
}

/**
 * POST /dossiers/:id/seances/:seanceId/change-requests { message }
 * Joint meetings are never cancelled online: the request goes to the conciliateur,
 * who calls the client back before changing anything.
 */
export async function requestSeanceChange(id: string, seanceId: string, userId: string, message: string) {
  await fakeLatency(400);
  const r = db().dossiers.find((x) => x.id === id);
  if (!r || !isMember(r, userId) || r.statut !== "en_cours") throw new ApiError(404, "Dossier introuvable.");
  const s = r.seances.find((x) => x.id === seanceId);
  if (!s || toSeance(s).statut !== "prevue") throw new ApiError(404, "Réunion introuvable.");
  if (s.demande && !s.demande.traiteeLe) throw new ApiError(409, "Une demande est déjà en cours pour cette réunion.");
  s.demande = { le: new Date().toISOString(), message, userId };
  return toSeance(s);
}
