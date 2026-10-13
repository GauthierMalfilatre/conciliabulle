import Link from "next/link";
import { ConciliateurAvatar } from "@/components/conciliateurs";
import { Badge, Card, Icon } from "@/components/ui";
import type { Appointment, AppointmentStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDay, formatTime } from "@/lib/format";

export const STATUT_BADGE: Record<AppointmentStatus, { label: string; variant: "success" | "destructive" | "secondary" }> = {
  confirme: { label: "Confirmé", variant: "success" },
  annule: { label: "Annulé", variant: "destructive" },
  passe: { label: "Passé", variant: "secondary" },
};

/** Date band on top, who and where underneath. */
export function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const badge = STATUT_BADGE[a.statut];
  const upcoming = a.statut === "confirme";
  return (
    <Link href={`/mes-rendez-vous/${a.id}`} className="group block rounded-lg">
      <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3",
            upcoming ? "bg-primary text-white" : "bg-muted text-foreground",
          )}
        >
          <Icon name="calendar" className="size-5" />
          <p className={cn("text-lg font-bold", a.statut === "annule" && "line-through")}>
            {formatDay(a.debut, { capital: true })} à {formatTime(a.debut)}
          </p>
          {!upcoming && (
            <Badge variant={badge.variant} className="ml-auto">
              {badge.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 p-5">
          <ConciliateurAvatar nom={a.conciliateur.nom} className="size-14 text-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-lg font-bold">{a.conciliateur.nom}</p>
            <p className="flex items-center gap-1.5 text-base text-muted-foreground">
              <Icon name="mapPin" />
              {a.lieu}
            </p>
          </div>
          <Icon name="chevronRight" className="size-6 shrink-0 text-primary" />
        </div>
      </Card>
    </Link>
  );
}
