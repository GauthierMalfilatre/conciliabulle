import Link from "next/link";
import { MODE_ICONS } from "@/components/conciliateurs";
import { Icon } from "@/components/ui";
import { DOMAINES, MODES, MOTIF_AUTRE } from "@/lib/api/referentiel";
import type { ProAppointment } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { AppointmentStatusBadge } from "./status";

/** One line of the diary: time, client, subject, channel and status. */
export function AppointmentRow({ a, showDate }: { a: ProAppointment; showDate?: string }) {
  return (
    <Link
      href={`/pro/rendez-vous/${a.id}`}
      className={cn(
        "flex items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-secondary/50",
        a.statut === "annule" && "opacity-70",
      )}
    >
      <span className="w-20 shrink-0 text-lg font-bold">
        {showDate && <span className="block text-sm font-normal text-muted-foreground">{showDate}</span>}
        {formatTime(a.debut)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-lg font-semibold", a.statut === "annule" && "line-through")}>{a.client.nom}</span>
        <span className="mb-1 block sm:hidden">
          <AppointmentStatusBadge statut={a.statut} />
        </span>
        <span className="flex flex-wrap items-center gap-x-3 text-base text-muted-foreground">
          <span>{a.motif === "autre" ? MOTIF_AUTRE.label : DOMAINES[a.motif].label}</span>
          <span className="flex items-center gap-1">
            <Icon name={MODE_ICONS[a.mode]} />
            {MODES[a.mode].label}
          </span>
        </span>
      </span>
      <span className="max-sm:hidden">
        <AppointmentStatusBadge statut={a.statut} />
      </span>
      <Icon name="chevronRight" className="size-5 text-primary" />
    </Link>
  );
}
