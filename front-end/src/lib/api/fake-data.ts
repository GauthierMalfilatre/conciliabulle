import { regionByCode } from "./referentiel";
import type { Conciliateur, Domaine, Horaires, Mode, Parametres, Weekday } from "./types";

type Seed = [
  id: string,
  nom: string,
  domaines: Domaine[],
  region: string,
  ville: string,
  lieu: string,
  adresse: string,
  modes: Mode[],
  langues?: string[],
];

const ALL: Mode[] = ["sur_place", "telephone", "visio"];

// Fictional people and places, for demonstration only.
const SEEDS: Seed[] = [
  ["m1", "Sophie Lambert", ["voisinage", "logement", "consommation"], "IDF", "Paris 11e", "Mairie du 11e arrondissement", "12 place Léon-Blum, 75011 Paris", ALL, ["Anglais"]],
  ["m2", "Karim Benali", ["voisinage", "logement"], "IDF", "Créteil", "Maison de justice et du droit", "8 avenue du Général-de-Gaulle, 94000 Créteil", ALL, ["Arabe"]],
  ["m3", "Isabelle Moreau", ["consommation", "impayes"], "ARA", "Lyon", "Mairie du 2e arrondissement", "2 rue d'Enghien, 69002 Lyon", ["sur_place", "telephone"]],
  ["m4", "Julien Roux", ["consommation", "commercial"], "ARA", "Grenoble", "Tribunal judiciaire", "Place Firmin-Gautier, 38000 Grenoble", ALL],
  ["m5", "Nathalie Girard", ["voisinage", "travaux"], "OCC", "Toulouse", "Mairie annexe Saint-Cyprien", "15 place Olivier, 31300 Toulouse", ALL, ["Espagnol"]],
  ["m6", "Thomas Fontaine", ["impayes", "commercial"], "OCC", "Montpellier", "Maison de justice et du droit", "5 rue Foch, 34000 Montpellier", ["sur_place", "visio"]],
  ["m7", "Aïcha Diallo", ["logement", "voisinage"], "HDF", "Lille", "Mairie de quartier de Wazemmes", "40 rue Nationale, 59000 Lille", ALL, ["Wolof"]],
  ["m8", "Pierre Lefèvre", ["voisinage", "travaux"], "HDF", "Amiens", "Hôtel de ville", "Place de l'Hôtel-de-Ville, 80000 Amiens", ["sur_place", "telephone"]],
  ["m9", "Claire Dubois", ["consommation", "logement"], "NAQ", "Bordeaux", "Mairie de quartier Bastide", "18 cours de l'Intendance, 33000 Bordeaux", ALL],
  ["m10", "Marc Vincent", ["impayes", "travaux"], "NAQ", "Limoges", "Tribunal judiciaire", "7 rue Jean-Jaurès, 87000 Limoges", ["sur_place", "telephone"]],
  ["m11", "Élodie Chevalier", ["voisinage", "logement"], "PAC", "Marseille", "Mairie des 1er et 7e arrondissements", "60 La Canebière, 13001 Marseille", ALL, ["Italien"]],
  ["m12", "Antoine Garnier", ["consommation"], "PAC", "Nice", "Maison de justice et du droit", "9 avenue Jean-Médecin, 06000 Nice", ["telephone", "visio"]],
  ["m13", "Fatima El Amrani", ["logement", "impayes"], "GES", "Strasbourg", "Centre administratif", "11 rue du Dôme, 67000 Strasbourg", ALL, ["Arabe", "Allemand"]],
  ["m14", "Laurent Perrin", ["voisinage"], "BRE", "Rennes", "Hôtel de ville", "Place de la Mairie, 35000 Rennes", ["sur_place", "telephone"]],
  ["m15", "Hélène Robin", ["voisinage", "consommation"], "PDL", "Nantes", "Mairie annexe Chantenay", "21 rue Crébillon, 44000 Nantes", ALL],
  ["m16", "François Mercier", ["travaux", "commercial"], "NOR", "Rouen", "Maison de justice et du droit", "14 rue du Gros-Horloge, 76000 Rouen", ["sur_place", "visio"]],
  ["m17", "Marie-Ange Lucas", ["voisinage", "logement"], "LRE", "Saint-Denis", "Mairie annexe du Chaudron", "30 rue de Paris, 97400 Saint-Denis", ALL, ["Créole réunionnais"]],
  ["m18", "Olivier Faure", ["consommation", "logement"], "CVL", "Tours", "Hôtel de ville", "6 rue Nationale, 37000 Tours", ALL],
  ["m19", "Anne Bertrand", ["impayes", "voisinage"], "BFC", "Dijon", "Maison de justice et du droit", "10 rue de la Liberté, 21000 Dijon", ["sur_place", "telephone"]],
  ["m20", "Jean-Baptiste Santoni", ["voisinage", "travaux"], "COR", "Ajaccio", "Hôtel de ville", "1 cours Napoléon, 20000 Ajaccio", ALL, ["Corse"]],
];

export const BASE_CONCILIATEURS: Conciliateur[] = SEEDS.map(
  ([id, nom, domaines, region, ville, lieu, adresse, modes, langues = []], i) => ({
    id,
    nom,
    domaines,
    region: regionByCode(region)!,
    ville,
    lieu,
    adresse,
    modes,
    langues: ["Français", ...langues],
    telephone: `0${(i % 5) + 1} ${String(20 + i).padStart(2, "0")} 45 67 ${String(10 + i * 3).slice(-2)}`,
    accesPMR: i % 4 !== 1,
    presentation:
      "Conciliateur de justice bénévole, nommé par la cour d'appel. Je vous reçois pour vous aider à trouver un accord à l'amiable, sans procès. C'est gratuit et confidentiel.",
    reservationOuverte: true,
  }),
);

const off = { actif: false, debut: "14:00", fin: "17:00" };
const matin = { actif: true, debut: "09:00", fin: "12:00" };
const apresMidi = { actif: true, debut: "14:00", fin: "17:00" };

/** Default office hours: a few half-days a week, as volunteers usually do. */
export function defaultParametres(conciliateurId: string): Parametres {
  const n = Number(conciliateurId.replace(/\D/g, ""));
  const jours = [[1, 3, 4], [1, 3, 5], [2, 3, 4], [1, 2, 4], [2, 4, 5]][n % 5] as Weekday[];
  const horaires = {} as Horaires;
  for (const d of [1, 2, 3, 4, 5, 6] as Weekday[]) {
    const works = jours.includes(d);
    horaires[d] = {
      matin: works ? { ...matin } : { ...matin, actif: false },
      apresMidi: works && d % 2 === 1 ? { ...apresMidi } : { ...off },
    };
  }
  return { horaires, dureeMinutes: 45, delaiMinHeures: 2, horizonSemaines: 4, absences: [] };
}
