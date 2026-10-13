import Link from "next/link";
import { Icon } from "@/components/ui";
import type { ProAppointment } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { AppointmentStatusBadge } from "./status";

/** One line of the diary: time, client, subject, place and status. */
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
        {a.motif && <span className="block truncate text-base text-muted-foreground">{a.motif}</span>}
        <span className="flex items-center gap-1 text-base text-muted-foreground">
          <Icon name="mapPin" className="shrink-0" />
          <span className="truncate">{a.lieu}</span>
        </span>
      </span>
      <span className="max-sm:hidden">
        <AppointmentStatusBadge statut={a.statut} />
      </span>
      <Icon name="chevronRight" className="size-5 text-primary" />
    </Link>
  );
}
