"use server";

import { redirect } from "next/navigation";
import {
  addSeance,
  closeDossier,
  closePeriod,
  markNotificationsRead,
  markRappelTraite,
  moveSeance,
  openDossier,
  renewCalendarLink,
  saveNote,
  saveParametres,
  saveProfil,
  setPresence,
} from "@/lib/api/pro";
import { DOMAINES, MODES } from "@/lib/api/referentiel";
import { platform } from "@/lib/api/store";
import { ApiError, type Domaine, type Horaires, type Mode, type Weekday } from "@/lib/api/types";
import { requirePro, safeNext } from "@/lib/auth/session";
import { withParams } from "@/lib/search-params";

// Every action re-checks that the caller is a conciliateur, and the API only lets
// them touch their own data. Outcomes are reported through the URL.

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function fail(e: unknown, url: string, params: Record<string, string> = {}): never {
  if (!(e instanceof ApiError)) throw e;
  redirect(withParams(url, { ...params, erreur: e.message }));
}

// --- Appointments ------------------------------------------------------------

export async function setPresenceAction(fd: FormData) {
  await requirePro();
  const id = text(fd, "id");
  const back = safeNext(text(fd, "retour") || `/pro/rendez-vous/${id}`);
  try {
    await setPresence(id, text(fd, "presence") === "absent" ? "absent" : "honore");
  } catch (e) {
    fail(e, back);
  }
  redirect(withParams(back, { presence: "1" }));
}

export async function saveNoteAction(fd: FormData) {
  await requirePro();
  const id = text(fd, "id");
  try {
    await saveNote(id, text(fd, "note"));
  } catch (e) {
    fail(e, `/pro/rendez-vous/${id}`);
  }
  redirect(`/pro/rendez-vous/${id}?note=1`);
}

export async function markNotificationsReadAction() {
  await requirePro();
  await markNotificationsRead();
  redirect("/pro?lu=1");
}

// --- Settings ----------------------------------------------------------------

export async function saveParametresAction(fd: FormData) {
  await requirePro();
  const plage = (d: Weekday, part: "matin" | "apres") => ({
    actif: fd.get(`j${d}-${part}-actif`) === "on",
    debut: text(fd, `j${d}-${part}-debut`) || (part === "matin" ? "09:00" : "14:00"),
    fin: text(fd, `j${d}-${part}-fin`) || (part === "matin" ? "12:00" : "17:00"),
  });
  const horaires = {} as Horaires;
  for (const d of [1, 2, 3, 4, 5, 6] as Weekday[]) horaires[d] = { matin: plage(d, "matin"), apresMidi: plage(d, "apres") };
  try {
    await saveParametres({
      horaires,
      dureeMinutes: Number(text(fd, "duree")) || platform().dureesRdvAutorisees[0],
      lieu: text(fd, "lieu"),
    });
  } catch (e) {
    fail(e, "/pro/parametres");
  }
  redirect("/pro/parametres?enregistre=1");
}

export async function closePeriodAction(fd: FormData) {
  await requirePro();
  let result: Awaited<ReturnType<typeof closePeriod>>;
  try {
    result = await closePeriod(text(fd, "du"), text(fd, "au") || text(fd, "du"));
  } catch (e) {
    fail(e, "/pro/parametres/absences");
  }
  redirect(withParams("/pro/parametres/absences", { retires: result.retires, reserves: result.reserves }));
}

export async function saveProfilAction(fd: FormData) {
  await requirePro();
  try {
    await saveProfil({
      ville: text(fd, "ville"),
      departement: text(fd, "departement"),
      presentation: text(fd, "presentation"),
      instructions: text(fd, "instructions"),
    });
  } catch (e) {
    fail(e, "/pro/parametres/profil");
  }
  redirect("/pro/parametres/profil?enregistre=1");
}

export async function renewCalendarLinkAction() {
  await requirePro();
  await renewCalendarLink();
  redirect("/pro/parametres/profil?agenda=1#agenda");
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
