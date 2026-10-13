/** French département, e.g. { code: "69", nom: "Rhône" }. */
export type Departement = { code: string; nom: string };

export type Mode = "sur_place" | "telephone" | "visio";

/** Disputes a conciliateur de justice can handle (not family law, not labour law). */
export type Domaine = "voisinage" | "logement" | "consommation" | "impayes" | "travaux" | "commercial";

export type Motif = Domaine | "autre";

export type Conciliateur = {
  id: string;
  /** Full name. */
  nom: string;
  departement: Departement;
  ville: string;
  presentation: string;
  // Not in the API yet: empty or missing, the pages hide them.
  domaines: Domaine[];
  langues: string[];
  modes: Mode[];
  telephone?: string;
  accesPMR?: boolean;
};

/** What a client needs to reach the conciliateur of an appointment or a case. */
export type ConciliateurContact = Pick<Conciliateur, "id" | "nom" | "ville" | "telephone">;

// --- Conciliateur settings -------------------------------------------------

/** 1 = Monday … 6 = Saturday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6;

/** A half-day of office hours, times as "HH:MM". */
export type Plage = { actif: boolean; debut: string; fin: string };

export type Horaires = Record<Weekday, { matin: Plage; apresMidi: Plage }>;

/** Weekly office hours, stored by the API as recurring availabilities. */
export type Parametres = {
  horaires: Horaires;
  /** One of the lengths allowed by the platform settings. */
  dureeMinutes: number;
  /** Where appointments take place, e.g. "Mairie du 3e, salle des permanences". */
  lieu: string;
};

// --- Slots & appointments ----------------------------------------------------

export type Slot = {
  /** `<conciliateur id>.<slot id>`, so that a slot alone says whose diary it is in. */
  id: string;
  conciliateurId: string;
  /** ISO 8601 */
  debut: string;
  fin: string;
  modes: Mode[];
  /** Where it takes place. */
  lieu: string;
};

export type AppointmentStatus = "confirme" | "annule" | "passe";

/** Client view of an appointment. */
export type Appointment = {
  id: string;
  conciliateur: ConciliateurContact;
  slotId: string;
  debut: string;
  fin: string;
  mode: Mode;
  lieu: string;
  /** What the client wrote when booking. */
  motif: string;
  /** Contact details given when booking. */
  contact: { prenom: string; nom: string; telephone: string };
  /** What to bring, set by the conciliateur. */
  instructions: string;
  statut: AppointmentStatus;
  /** Past this instant the appointment can no longer be changed online. */
  modifiableJusquA: string;
};

export type ProAppointmentStatus = "a_venir" | "a_renseigner" | "honore" | "absent" | "annule";

/** Conciliateur view of an appointment, with the client's contact details. */
export type ProAppointment = {
  id: string;
  debut: string;
  fin: string;
  mode: Mode;
  lieu: string;
  motif: string;
  client: { nom: string; telephone: string };
  statut: ProAppointmentStatus;
  note?: string;
  dossierId?: string;
};

export type ConciliateurSearch = {
  /** Matches the conciliateur's name or city. */
  q?: string;
  /** Département code. */
  departement?: string;
  /** Only conciliateurs with a free slot. */
  dispo?: boolean;
  limit?: number;
};

export type ConciliateurWithSlots = Conciliateur & {
  /** Free slots over the next few days, shown as day columns in results. */
  apercu: { days: string[]; slots: Slot[] };
  /** First free slot within the booking horizon, for when the preview days are full. */
  prochainCreneau?: Slot;
};

// --- Conciliation cases ------------------------------------------------------

export type DossierStatut = "en_cours" | "accord" | "echec";

export type Seance = {
  id: string;
  /** ISO 8601 */
  debut: string;
  fin: string;
  mode: Mode;
  statut: "prevue" | "passee";
  /** Set once the client has asked the conciliateur to move it. */
  changementDemandeLe?: string;
};

/**
 * Client view of a conciliation case. Clients join it with the personal code
 * the conciliateur gave them. Never exposes the other party.
 */
export type Dossier = {
  id: string;
  reference: string;
  conciliateur: ConciliateurContact;
  objet: Domaine;
  statut: DossierStatut;
  seances: Seance[];
};

export type ProSeance = Seance & {
  demande?: { le: string; message: string; traiteeLe?: string };
};

export type Partie = { role: "A" | "B"; nom: string; code: string; rejoint: boolean };

/** Conciliateur view of a case: both parties and their codes. */
export type ProDossier = {
  id: string;
  reference: string;
  objet: Domaine;
  statut: DossierStatut;
  ouvertLe: string;
  parties: Partie[];
  seances: ProSeance[];
  rendezVousId?: string;
};

// --- Callback requests -------------------------------------------------------

export type CallbackRequest = {
  id: string;
  nom: string;
  telephone: string;
  moment: "matin" | "apres-midi" | "indifferent";
  motif?: Domaine;
  conciliateurId?: string;
  userId?: string;
  createdAt: string;
  traiteeLe?: string;
};

/** An error answer of the API (or of the demo backend), with its HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Machine-readable reason when a status covers several cases. */
    public code?: string,
    /** The parsed error body, e.g. DRF field errors. */
    public body?: unknown,
  ) {
    super(message);
  }
}

// --- Service settings (Paramètres › Réglages du service) ---------------------

export type PlatformSettings = {
  /** Sign-in sessions: maximum length, then a new sign-in is required. */
  sessionDureeHeures: number;
  /** Sign-out after this much inactivity; 0 disables it. */
  inactiviteMinutes: number;
  /** Wrong conciliation-case codes allowed before the account is blocked. */
  maxEssaisCodeDossier: number;

  /** Upcoming appointments a client may hold at once; 0 means no limit. */
  maxRdvAVenir: number;
  /** Appointment lengths conciliateurs may choose from. */
  dureesRdvAutorisees: number[];
  /** Default length of a joint conciliation meeting. */
  dureeReunionMinutes: number;

  rappelVeille: boolean;
  rappelJourMeme: boolean;
  /** Promised delay for a callback, in working days. */
  delaiRappelJours: number;

  numeroAide: string;
  bandeau: { actif: boolean; message: string };
};
