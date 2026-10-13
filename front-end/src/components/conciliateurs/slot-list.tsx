import Link from "next/link";
import type { Slot } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { dayKey, formatDay, formatTime } from "@/lib/format";

export const slotButtonClasses = cn(
  "inline-flex min-h-11 items-center gap-3 rounded-md bg-secondary px-3 text-base font-semibold text-secondary-foreground",
  "transition-colors hover:bg-primary hover:text-white",
);

const TZ = "Europe/Paris";
const weekday = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: TZ }).format(new Date(iso));
const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));

/**
 * Days side by side, times stacked underneath (the familiar booking-site layout).
 * On small screens only the first `mobileDays` columns are shown.
 */
export function AvailabilityGrid({
  days,
  slots,
  hrefFor,
  maxPerDay,
  mobileDays = 3,
  selectedId,
}: {
  days: string[];
  slots: Slot[];
  hrefFor: (slot: Slot) => string;
  maxPerDay?: number;
  mobileDays?: number;
  selectedId?: string;
}) {
  const byDay = Map.groupBy(slots, (s) => dayKey(s.debut));
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day, i) => {
        const all = byDay.get(dayKey(day)) ?? [];
        const shown = maxPerDay ? all.slice(0, maxPerDay) : all;
        return (
          <div
            key={day}
            role="group"
            aria-label={formatDay(day)}
            className={cn("flex min-w-0 flex-col gap-2", i >= mobileDays && "max-sm:hidden")}
          >
            <p className="text-center leading-tight">
              <span className="block text-base font-semibold capitalize">{weekday(day)}</span>
              <span className="block text-sm text-muted-foreground">{dayMonth(day)}</span>
            </p>
            {shown.length === 0 ? (
              <span className="grid min-h-11 place-items-center text-muted-foreground" aria-label="Pas de disponibilité">
                —
              </span>
            ) : (
              shown.map((slot) => (
                <Link
                  key={slot.id}
                  href={hrefFor(slot)}
                  aria-label={`${formatDay(slot.debut)} à ${formatTime(slot.debut)}`}
                  aria-current={slot.id === selectedId ? "true" : undefined}
                  className={cn(
                    slotButtonClasses,
                    "justify-center px-1 text-sm whitespace-nowrap",
                    slot.id === selectedId && "bg-primary text-white",
                  )}
                >
                  {formatTime(slot.debut)}
                </Link>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Slots grouped by day, as a list: used on small screens for a full week. */
export function SlotList({
  days,
  slots,
  hrefFor,
  selectedId,
}: {
  /** ISO dates of the days to show, including days without slots. */
  days: string[];
  slots: Slot[];
  hrefFor: (slot: Slot) => string;
  selectedId?: string;
}) {
  const byDay = Map.groupBy(slots, (s) => dayKey(s.debut));

  return (
    <ul className="flex flex-col divide-y divide-border">
      {days.map((day) => {
        const daySlots = byDay.get(dayKey(day)) ?? [];
        return (
          <li key={day} className="flex flex-col gap-3 py-4">
            <p className="text-base font-semibold">{formatDay(day, { capital: true })}</p>
            {daySlots.length === 0 ? (
              <p className="text-base text-muted-foreground">Pas de disponibilité</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <Link
                    key={slot.id}
                    href={hrefFor(slot)}
                    aria-label={`${formatDay(slot.debut)} à ${formatTime(slot.debut)}`}
                    aria-current={slot.id === selectedId ? "true" : undefined}
                    className={cn(
                      slotButtonClasses,
                      "min-w-24 justify-center",
                      slot.id === selectedId && "bg-primary text-white",
                    )}
                  >
                    {formatTime(slot.debut)}
                  </Link>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Full week: columns on wide screens, a list on phones. */
export function WeekSlots(props: Parameters<typeof SlotList>[0]) {
  return (
    <>
      <div className="max-md:hidden">
        <AvailabilityGrid {...props} mobileDays={props.days.length} />
      </div>
      <div className="md:hidden">
        <SlotList {...props} />
      </div>
    </>
  );
}
