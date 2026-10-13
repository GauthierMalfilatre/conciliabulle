import { Badge, type BadgeProps } from "@/components/ui";
import type { DossierStatut, ProAppointmentStatus } from "@/lib/api/types";

const APPOINTMENT: Record<ProAppointmentStatus, { label: string; variant: BadgeProps["variant"] }> = {
  a_venir: { label: "À venir", variant: "primary" },
  a_renseigner: { label: "À renseigner", variant: "warning" },
  honore: { label: "Honoré", variant: "success" },
  absent: { label: "Absent", variant: "destructive" },
  annule: { label: "Annulé", variant: "secondary" },
};

export function AppointmentStatusBadge({ statut }: { statut: ProAppointmentStatus }) {
  const s = APPOINTMENT[statut];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const DOSSIER: Record<DossierStatut, { label: string; variant: BadgeProps["variant"] }> = {
  en_cours: { label: "En cours", variant: "primary" },
  accord: { label: "Accord trouvé", variant: "success" },
  echec: { label: "Pas d'accord", variant: "secondary" },
};

export function DossierStatusBadge({ statut }: { statut: DossierStatut }) {
  const s = DOSSIER[statut];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
