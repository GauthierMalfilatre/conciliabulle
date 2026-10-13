export type Region = { code: string; nom: string };

export type Mode = "sur_place" | "telephone" | "visio";

/** Disputes a conciliateur de justice can handle (not family law, not labour law). */
export type Domaine = "voisinage" | "logement" | "consommation" | "impayes" | "travaux" | "commercial";

export type Motif = Domaine | "autre";

export type Conciliateur = {
  id: string;
  nom: string;
  domaines: Domaine[];
  langues: string[];
  modes: Mode[];
  region: Region;
  ville: string;
  /** Where the conciliateur holds office hours, e.g. "Mairie du 11e arrondissement". */
  lieu: string;
  adresse: string;
  telephone: string;
  accesPMR: boolean;
  presentation: string;
  /** False while the conciliateur has paused online booking. */
  reservationOuverte: boolean;
};

export type ConciliateurContact = Pick<Conciliateur, "id" | "nom" | "ville" | "lieu" | "adresse" | "telephone">;

// --- Conciliateur settings -------------------------------------------------

/** 1 = Monday … 6 = Saturday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6;

/** A half-day of office hours, times as "HH:MM". */
export type Plage = { actif: boolean; debut: string; fin: string };

export type Horaires = Record<Weekday, { matin: Plage; apresMidi: Plage }>;

export type Absence = {
  id: string;
  /** "YYYY-MM-DD", inclusive. */
  du: string;
  au: string;
  motif: string;
};

export type Parametres = {
  horaires: Horaires;
  /** One of the lengths allowed by the platform settings. */
  dureeMinutes: number;
  /** Minimum notice before a slot can be booked. */
  delaiMinHeures: number;
  /** How far ahead clients can book. */
  horizonSemaines: number;
  absences: Absence[];
};

// --- Slots & appointments ----------------------------------------------------

export type Slot = {
  id: string;
  conciliateurId: string;
  /** ISO 8601 */
  debut: string;
  fin: string;
  modes: Mode[];
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
  motif: Motif;
  statut: AppointmentStatus;
  /** Past this instant the appointment can no longer be changed online. */
  modifiableJusquA: string;
  annulation?: { par: "client" | "conciliateur"; message?: string };
};

export type ProAppointmentStatus = "a_venir" | "a_renseigner" | "honore" | "absent" | "annule";

/** Conciliateur view of an appointment, with the client's contact details. */
export type ProAppointment = {
  id: string;
  debut: string;
  fin: string;
  mode: Mode;
  motif: Motif;
  client: { nom: string; telephone: string };
  statut: ProAppointmentStatus;
  creeLe: string;
  annulation?: { par: "client" | "conciliateur"; message?: string };
  note?: string;
  dossierId?: string;
};

export type ConciliateurSearch = {
  /** Matches the conciliateur's name or city. */
  q?: string;
  region?: string;
  domaine?: string;
  mode?: string;
  /** Only conciliateurs with a free slot in the next 7 days. */
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

/** Mirrors the HTTP status the real API would return. */
export class ApiError extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409,
    message: string,
    /** Machine-readable reason when a status covers several cases. */
    public code?: string,
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

  /** Clients can change or cancel online until this long before. */
  delaiModificationHeures: number;
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
  /** Stops all online booking, e.g. during maintenance. */
};
