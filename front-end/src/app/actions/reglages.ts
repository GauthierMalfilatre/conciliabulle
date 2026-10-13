"use server";

import { redirect } from "next/navigation";
import { resetPlatformSettings, savePlatformSettings } from "@/lib/api/reglages";
import { ApiError, type PlatformSettings } from "@/lib/api/types";
import { requirePro } from "@/lib/auth/session";
import { withParams } from "@/lib/search-params";

// Every action re-checks that the caller is a conciliateur.

const PAGE = "/pro/parametres/reglages";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string) => Number(text(fd, key));
const on = (fd: FormData, key: string) => fd.get(key) === "on";

/** One action per settings card; `section` says which fields were sent. */
export async function saveSettingsAction(fd: FormData) {
  await requirePro();
  const section = text(fd, "section");
  let patch: Partial<PlatformSettings> = {};
  switch (section) {
    case "sessions":
      patch = {
        sessionDureeHeures: num(fd, "sessionDureeHeures"),
        inactiviteMinutes: num(fd, "inactiviteMinutes"),
        maxEssaisCodeDossier: num(fd, "maxEssaisCodeDossier"),
      };
      break;
    case "rendez-vous":
      patch = {
        delaiModificationHeures: num(fd, "delaiModificationHeures"),
        maxRdvAVenir: num(fd, "maxRdvAVenir"),
        dureesRdvAutorisees: fd.getAll("dureesRdvAutorisees").map(Number),
        dureeReunionMinutes: num(fd, "dureeReunionMinutes"),
      };
      break;
    case "notifications":
      patch = {
        rappelVeille: on(fd, "rappelVeille"),
        rappelJourMeme: on(fd, "rappelJourMeme"),
        delaiRappelJours: num(fd, "delaiRappelJours"),
      };
      break;
    case "site":
      patch = {
        numeroAide: text(fd, "numeroAide"),
        bandeau: { actif: on(fd, "bandeauActif"), message: text(fd, "bandeauMessage") },
      };
      break;
    default:
      redirect(PAGE);
  }
  try {
    await savePlatformSettings(patch);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    redirect(withParams(PAGE, { erreur: e.message }) + `#${section}`);
  }
  redirect(`${PAGE}?enregistre=${section}#${section}`);
}

export async function resetSettingsAction() {
  await requirePro();
  await resetPlatformSettings();
  redirect(`${PAGE}?reinitialise=1`);
}
