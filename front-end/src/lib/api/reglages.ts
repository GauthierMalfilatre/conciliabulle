import { fakeLatency } from "./latency";
import { DEFAULT_PLATFORM, platform } from "./store";
import { ApiError, type PlatformSettings } from "./types";

// Service settings, edited by conciliateurs from Paramètres › Réglages du service.

/** Allowed values, shared with the settings form. */
export const OPTIONS = {
  // Not beyond the API's refresh token, valid one day.
  sessionDureeHeures: [1, 4, 8, 24],
  inactiviteMinutes: [0, 15, 30, 60, 120],
  maxEssaisCodeDossier: [3, 5, 10],
  maxRdvAVenir: [0, 1, 2, 3, 5],
  dureesRdv: [20, 30, 45, 60, 90],
  dureeReunionMinutes: [45, 60, 90, 120],
  delaiRappelJours: [1, 2, 3, 5],
} as const;

/** GET /reglages */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  await fakeLatency(100);
  return structuredClone(platform());
}

/** PUT /reglages — partial update, validated against the allowed values. */
export async function savePlatformSettings(patch: Partial<PlatformSettings>) {
  await fakeLatency(300);
  const allowed = (key: keyof typeof OPTIONS, value: number | undefined) =>
    value === undefined || (OPTIONS[key] as readonly number[]).includes(value);
  if (
    !allowed("sessionDureeHeures", patch.sessionDureeHeures) ||
    !allowed("inactiviteMinutes", patch.inactiviteMinutes) ||
    !allowed("maxEssaisCodeDossier", patch.maxEssaisCodeDossier) ||
    !allowed("maxRdvAVenir", patch.maxRdvAVenir) ||
    !allowed("dureeReunionMinutes", patch.dureeReunionMinutes) ||
    !allowed("delaiRappelJours", patch.delaiRappelJours)
  ) {
    throw new ApiError(400, "Une des valeurs n'est pas autorisée.");
  }
  if (patch.inactiviteMinutes && patch.sessionDureeHeures && patch.inactiviteMinutes > patch.sessionDureeHeures * 60) {
    throw new ApiError(400, "L'inactivité ne peut pas dépasser la durée maximale de session.");
  }
  if (patch.dureesRdvAutorisees) {
    const list = patch.dureesRdvAutorisees.filter((d) => (OPTIONS.dureesRdv as readonly number[]).includes(d));
    if (list.length === 0) throw new ApiError(400, "Gardez au moins une durée de rendez-vous.");
    patch.dureesRdvAutorisees = [...list].sort((a, b) => a - b);
  }
  if (patch.numeroAide !== undefined && !/^[0-9 +]{6,20}$/.test(patch.numeroAide.trim())) {
    throw new ApiError(400, "Le numéro d'aide ne doit contenir que des chiffres et des espaces.");
  }
  if (patch.bandeau?.actif && !patch.bandeau.message.trim()) {
    throw new ApiError(400, "Écrivez le message du bandeau avant de l'afficher.");
  }
  Object.assign(platform(), patch);
}

/** POST /reglages/reset */
export async function resetPlatformSettings() {
  await fakeLatency(200);
  Object.assign(platform(), structuredClone(DEFAULT_PLATFORM));
}
