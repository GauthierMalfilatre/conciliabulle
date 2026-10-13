import Link from "next/link";
import { buttonClasses, Icon } from "@/components/ui";
import { formatDay } from "@/lib/format";

export const MAX_WEEKS = 4;

export function WeekNavigator({
  week,
  days,
  hrefFor,
  maxWeeks = MAX_WEEKS,
}: {
  week: number;
  days: string[];
  hrefFor: (week: number) => string;
  /** How many weeks ahead can be browsed (the booking horizon). */
  maxWeeks?: number;
}) {
  const prev = week > 0;
  const next = week < maxWeeks - 1;
  return (
    <div className="flex items-center justify-between gap-2">
      {prev ? (
        <Link href={hrefFor(week - 1)} className={buttonClasses({ variant: "outline", size: "lg" })}>
          <Icon name="chevronLeft" className="size-5" />
          <span className="max-sm:sr-only">Semaine précédente</span>
        </Link>
      ) : (
        <span />
      )}
      <p className="text-center text-base font-semibold">
        Du {formatDay(days[0])} au {formatDay(days[days.length - 1])}
      </p>
      {next ? (
        <Link href={hrefFor(week + 1)} className={buttonClasses({ variant: "outline", size: "lg" })}>
          <span className="max-sm:sr-only">Semaine suivante</span>
          <Icon name="chevronRight" className="size-5" />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

export function parseWeek(value: string | undefined, maxWeeks = MAX_WEEKS) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < maxWeeks ? n : 0;
}
