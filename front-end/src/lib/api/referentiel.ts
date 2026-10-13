import type { Domaine, Mode, Region, Weekday } from "./types";

export const REGIONS: Region[] = [
  { code: "ARA", nom: "Auvergne-Rhône-Alpes" },
  { code: "BFC", nom: "Bourgogne-Franche-Comté" },
  { code: "BRE", nom: "Bretagne" },
  { code: "CVL", nom: "Centre-Val de Loire" },
  { code: "COR", nom: "Corse" },
  { code: "GES", nom: "Grand Est" },
  { code: "HDF", nom: "Hauts-de-France" },
  { code: "IDF", nom: "Île-de-France" },
  { code: "NOR", nom: "Normandie" },
  { code: "NAQ", nom: "Nouvelle-Aquitaine" },
  { code: "OCC", nom: "Occitanie" },
  { code: "PDL", nom: "Pays de la Loire" },
  { code: "PAC", nom: "Provence-Alpes-Côte d'Azur" },
  { code: "GUA", nom: "Guadeloupe" },
  { code: "MTQ", nom: "Martinique" },
  { code: "GUY", nom: "Guyane" },
  { code: "LRE", nom: "La Réunion" },
  { code: "MAY", nom: "Mayotte" },
];

export const DOMAINES: Record<Domaine, { label: string; motif: string }> = {
  voisinage: { label: "Voisinage", motif: "Un conflit avec un voisin (bruit, haie, mur, stationnement…)" },
  logement: { label: "Logement", motif: "Un problème entre locataire et propriétaire" },
  consommation: { label: "Consommation", motif: "Un litige avec un commerçant ou une entreprise" },
  impayes: { label: "Somme due", motif: "Une somme d'argent qu'on me doit, ou que je dois" },
  travaux: { label: "Travaux", motif: "Des travaux mal faits ou pas terminés" },
  commercial: { label: "Entre professionnels", motif: "Un litige entre commerçants ou artisans" },
};

export const MOTIF_AUTRE = { label: "Autre", motif: "Autre chose" };

export const MODES: Record<Mode, { label: string; description: string }> = {
  sur_place: { label: "Sur place", description: "Au lieu de permanence du conciliateur" },
  telephone: { label: "Par téléphone", description: "Le conciliateur vous appelle à l'heure prévue" },
  visio: { label: "En visio", description: "Un lien vous est envoyé par email" },
};

export type Moment = "matin" | "apres-midi" | "indifferent";

export const MOMENTS: Record<Moment, string> = {
  matin: "Le matin (9 h – 12 h)",
  "apres-midi": "L'après-midi (14 h – 18 h)",
  indifferent: "Peu importe",
};

export const JOURS: Record<Weekday, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

export const DELAIS_MIN_HEURES = [2, 24, 48] as const;
export const HORIZONS_SEMAINES = [2, 4, 8] as const;

export const ISSUES_DOSSIER = {
  en_cours: "En cours",
  accord: "Accord trouvé",
  echec: "Pas d'accord",
} as const;

export function regionByCode(code: string) {
  return REGIONS.find((r) => r.code === code);
}

export function motifLabel(motif: Domaine | "autre") {
  return motif === "autre" ? MOTIF_AUTRE.motif : DOMAINES[motif].motif;
}

/** "Vous recevrez un rappel la veille." — follows the notification settings. */
export function rappelsTexte(s: { rappelVeille: boolean; rappelJourMeme: boolean }) {
  if (s.rappelVeille && s.rappelJourMeme) return "Vous recevrez un rappel la veille et le jour même.";
  if (s.rappelVeille) return "Vous recevrez un rappel la veille.";
  if (s.rappelJourMeme) return "Vous recevrez un rappel le jour même.";
  return "";
}
