import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout";
import { AppointmentRow, bandButton, ProBand } from "@/components/pro";
import { Badge, buttonClasses, Card, Icon } from "@/components/ui";
import { getAgenda } from "@/lib/api/pro";
import { requirePro } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dayKey, formatDay, formatShortDate } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Agenda" };

export default function AgendaPage({ searchParams }: PageProps<"/pro/agenda">) {
  return (
    <Suspense fallback={<div className="h-40 bg-primary" aria-busy><span className="sr-only">Chargement…</span></div>}>
      <Agenda searchParams={searchParams} />
    </Suspense>
  );
}

async function Agenda({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  await requirePro();
  const n = Number(param(sp, "semaine"));
  const week = Number.isInteger(n) && Math.abs(n) <= 26 ? n : 0;
  const { days } = await getAgenda(week);
  const today = dayKey(new Date().toISOString());
  const count = days.reduce((s, d) => s + d.appointments.filter((a) => a.statut !== "annule").length, 0);

  return (
    <>
      <ProBand
        title="Agenda"
        subtitle={`Semaine du ${formatShortDate(days[0].date)} au ${formatShortDate(days[6].date)}`}
        actions={
          <>
            <Link href="/pro/parametres" className={bandButton}>
              <Icon name="sliders" className="size-5" /> Mes horaires
            </Link>
            <Link href="/pro/parametres/absences" className={bandButton}>
              <Icon name="calendar" className="size-5" /> Fermer des jours
            </Link>
          </>
        }
      />
      <Container className="flex flex-col gap-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/pro/agenda?semaine=${week - 1}`} className={buttonClasses({ variant: "outline" })}>
            <Icon name="chevronLeft" className="size-5" /> Semaine précédente
          </Link>
          <p className="text-lg">
            <strong>{count}</strong> rendez-vous cette semaine
            {week !== 0 && (
              <>
                {" · "}
                <Link href="/pro/agenda" className="font-semibold text-primary hover:underline">
                  Revenir à aujourd&apos;hui
                </Link>
              </>
            )}
          </p>
          <Link href={`/pro/agenda?semaine=${week + 1}`} className={buttonClasses({ variant: "outline" })}>
            Semaine suivante <Icon name="chevronRight" className="size-5" />
          </Link>
        </div>

        {days.map((d) => {
          const isToday = dayKey(d.date) === today;
          if (new Date(d.date).getDay() === 0 && d.appointments.length === 0 && d.libres === 0) return null;
          return (
            <Card key={d.date} className={cn("overflow-hidden", isToday && "border-2 border-primary")}>
              <h2 className="flex flex-wrap items-center gap-3 border-b border-border bg-[#f9fafc] px-5 py-3 text-lg">
                {formatDay(d.date, { capital: true })}
                {isToday && <Badge variant="default">Aujourd&apos;hui</Badge>}
                {d.libres > 0 && (
                  <Badge variant="secondary">
                    {d.libres} horaire{d.libres > 1 ? "s" : ""} libre{d.libres > 1 ? "s" : ""}
                  </Badge>
                )}
              </h2>
              {d.appointments.length === 0 ? (
                <p className="px-5 py-4 text-base text-muted-foreground">Aucun rendez-vous.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.appointments.map((a) => (
                    <li key={a.id}>
                      <AppointmentRow a={a} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </Container>
    </>
  );
}
