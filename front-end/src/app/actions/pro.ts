"use server";

import { redirect } from "next/navigation";
import {
  addAbsence,
  addSeance,
  cancelByConciliateur,
  closeDossier,
  markRappelTraite,
  moveSeance,
  openDossier,
  removeAbsence,
  saveNote,
  saveParametres,
  saveProfil,
  setPresence,
  setReservationOuverte,
} from "@/lib/api/pro";
import { DELAIS_MIN_HEURES, DOMAINES, HORIZONS_SEMAINES, MODES } from "@/lib/api/referentiel";
import { platform } from "@/lib/api/store";
import { ApiError, type Domaine, type Horaires, type Mode, type Parametres, type Weekday } from "@/lib/api/types";
import { requirePro, safeNext } from "@/lib/auth/session";
import { withParams } from "@/lib/search-params";

// Every action re-checks that the caller is a conciliateur, and the API only lets
// them touch their own data. Outcomes are reported through the URL.

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const oneOf = <T extends number>(values: readonly T[], raw: string, fallback: T) =>
  (values.find((v) => String(v) === raw) ?? fallback) as T;

function fail(e: unknown, url: string, params: Record<string, string> = {}): never {
  if (!(e instanceof ApiError)) throw e;
  redirect(withParams(url, { ...params, erreur: e.message }));
}

// --- Appointments ------------------------------------------------------------

export async function setPresenceAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const id = text(fd, "id");
  const back = safeNext(text(fd, "retour") || `/pro/rendez-vous/${id}`);
  try {
    await setPresence(conciliateurId, id, text(fd, "presence") === "absent" ? "absent" : "honore");
  } catch (e) {
    fail(e, back);
  }
  redirect(withParams(back, { presence: "1" }));
}

export async function cancelByConciliateurAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const id = text(fd, "id");
  try {
    await cancelByConciliateur(conciliateurId, id, text(fd, "message"));
  } catch (e) {
    fail(e, `/pro/rendez-vous/${id}`);
  }
  redirect(`/pro/rendez-vous/${id}?annule=1`);
}

export async function saveNoteAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const id = text(fd, "id");
  try {
    await saveNote(conciliateurId, id, text(fd, "note"));
  } catch (e) {
    fail(e, `/pro/rendez-vous/${id}`);
  }
  redirect(`/pro/rendez-vous/${id}?note=1`);
}

// --- Settings ----------------------------------------------------------------

export async function saveParametresAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const plage = (d: Weekday, part: "matin" | "apres") => ({
    actif: fd.get(`j${d}-${part}-actif`) === "on",
    debut: text(fd, `j${d}-${part}-debut`) || (part === "matin" ? "09:00" : "14:00"),
    fin: text(fd, `j${d}-${part}-fin`) || (part === "matin" ? "12:00" : "17:00"),
  });
  const horaires = {} as Horaires;
  for (const d of [1, 2, 3, 4, 5, 6] as Weekday[]) horaires[d] = { matin: plage(d, "matin"), apresMidi: plage(d, "apres") };
  const input: Pick<Parametres, "horaires" | "dureeMinutes" | "delaiMinHeures" | "horizonSemaines"> = {
    horaires,
    dureeMinutes: Number(text(fd, "duree")) || platform().dureesRdvAutorisees[0],
    delaiMinHeures: oneOf(DELAIS_MIN_HEURES, text(fd, "delai"), 24),
    horizonSemaines: oneOf(HORIZONS_SEMAINES, text(fd, "horizon"), 4),
  };
  try {
    await saveParametres(conciliateurId, input);
  } catch (e) {
    fail(e, "/pro/parametres");
  }
  redirect("/pro/parametres?enregistre=1");
}

export async function toggleReservationAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const ouverte = text(fd, "ouverte") === "1";
  await setReservationOuverte(conciliateurId, ouverte);
  redirect(withParams(safeNext(text(fd, "retour") || "/pro/parametres"), { reservation: ouverte ? "ouverte" : "pause" }));
}

export async function addAbsenceAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  try {
    await addAbsence(conciliateurId, {
      du: text(fd, "du"),
      au: text(fd, "au") || text(fd, "du"),
      motif: text(fd, "motif") || "Absence",
    });
  } catch (e) {
    fail(e, "/pro/parametres/absences");
  }
  redirect("/pro/parametres/absences?ajoute=1");
}

export async function removeAbsenceAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  await removeAbsence(conciliateurId, text(fd, "id"));
  redirect("/pro/parametres/absences?supprime=1");
}

export async function saveProfilAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const domaines = fd.getAll("domaines").map(String).filter((d): d is Domaine => d in DOMAINES);
  const modes = fd.getAll("modes").map(String).filter((m): m is Mode => m in MODES);
  try {
    await saveProfil(conciliateurId, {
      lieu: text(fd, "lieu"),
      adresse: text(fd, "adresse"),
      telephone: text(fd, "telephone"),
      presentation: text(fd, "presentation"),
      langues: ["Français", ...text(fd, "langues").split(",").map((l) => l.trim()).filter((l) => l && l.toLowerCase() !== "français")],
      accesPMR: fd.get("accesPMR") === "on",
      domaines,
      modes,
    });
  } catch (e) {
    fail(e, "/pro/parametres/profil");
  }
  redirect("/pro/parametres/profil?enregistre=1");
}

// --- Requests ----------------------------------------------------------------

export async function markRappelAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  try {
    await markRappelTraite(conciliateurId, text(fd, "id"));
  } catch (e) {
    fail(e, "/pro/demandes");
  }
  redirect("/pro/demandes?traite=1");
}

// --- Cases -------------------------------------------------------------------

export async function openDossierAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const rdv = text(fd, "rdv");
  const objet = text(fd, "objet");
  let id: string;
  try {
    id = await openDossier(conciliateurId, rdv, text(fd, "autre"), (objet in DOMAINES ? objet : "voisinage") as Domaine);
  } catch (e) {
    fail(e, "/pro/dossiers/nouveau", { rdv });
  }
  redirect(`/pro/dossiers/${id}?ouvert=1`);
}

export async function addSeanceAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const id = text(fd, "dossier");
  const mode = text(fd, "mode");
  try {
    await addSeance(conciliateurId, id, {
      date: text(fd, "date"),
      heure: text(fd, "heure"),
      mode: (mode in MODES ? mode : "sur_place") as Mode,
    });
  } catch (e) {
    fail(e, `/pro/dossiers/${id}`);
  }
  redirect(`/pro/dossiers/${id}?ajoutee=1`);
}

export async function moveSeanceAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const id = text(fd, "dossier");
  try {
    await moveSeance(conciliateurId, id, text(fd, "seance"), { date: text(fd, "date"), heure: text(fd, "heure") });
  } catch (e) {
    fail(e, `/pro/dossiers/${id}`);
  }
  redirect(`/pro/dossiers/${id}?deplacee=1`);
}

export async function closeDossierAction(fd: FormData) {
  const { conciliateurId } = await requirePro();
  const id = text(fd, "dossier");
  try {
    await closeDossier(conciliateurId, id, text(fd, "issue") === "echec" ? "echec" : "accord");
  } catch (e) {
    fail(e, `/pro/dossiers/${id}`);
  }
  redirect(`/pro/dossiers/${id}?clos=1`);
}
