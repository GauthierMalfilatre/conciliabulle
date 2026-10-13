export const STATUSES = ["justiciable", "conciliateur"] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  justiciable: "Justiciable",
  conciliateur: "Conciliateur de justice",
};

export type User = {
  id: string;
  name: string;
  email: string;
  telephone: string;
  status: Status;
  /** Set for conciliateurs: which directory entry they manage. */
  conciliateurId?: string;
};
