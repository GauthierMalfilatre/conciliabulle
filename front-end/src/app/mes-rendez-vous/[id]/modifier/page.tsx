import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { rescheduleAppointment } from "@/app/actions/appointments";
import { BackLink, Container } from "@/components/layout";
import { parseWeek, WeekNavigator, WeekSlots } from "@/components/conciliateurs";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Icon } from "@/components/ui";
import { getAppointment, isModifiable } from "@/lib/api/appointments";
import { getSlot, getWeekSlots } from "@/lib/api/conciliateurs";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { param, withParams, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Changer la date" };

export default function ModifierPage({ params, searchParams }: PageProps<"/mes-rendez-vous/[id]/modifier">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy>
          <span className="sr-only">Chargement…</span>
        </div>}>
        <Modifier params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Modifier({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireClient();
  const a = await getAppointment(id, user.id);
  if (!a) notFound();
  if (!isModifiable(a)) redirect(`/mes-rendez-vous/${id}?erreur=delai`);

  const week = parseWeek(param(sp, "semaine"));
  const creneau = param(sp, "creneau");
  const [{ days, slots }, chosen] = await Promise.all([
    getWeekSlots(a.conciliateur.id, week),
    creneau ? getSlot(creneau) : null,
  ]);
  const valid = chosen?.available && chosen.slot.conciliateurId === a.conciliateur.id ? chosen.slot : null;
  const href = (extra: Record<string, string | number | undefined>) =>
    withParams(`/mes-rendez-vous/${id}/modifier`, { semaine: week, ...extra });

  return (
    <>
      <BackLink href={`/mes-rendez-vous/${id}`}>Retour au rendez-vous</BackLink>
      <h1 className="text-3xl">Changer la date</h1>

      {param(sp, "erreur") === "pris" && (
        <Alert variant="warning" title="Ce créneau vient d'être réservé">
          Choisissez un autre horaire ci-dessous.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Rendez-vous actuel</p>
          <p className="text-lg font-semibold">{formatDateTime(a.debut, { capital: true })}</p>
        </Card>
        <Icon name="arrowRight" className="size-6 justify-self-center text-muted-foreground max-sm:rotate-90" />
        <Card className={valid ? "border-2 border-primary p-5" : "border-dashed p-5"}>
          <p className="text-sm text-muted-foreground">Nouveau rendez-vous</p>
          <p className="text-lg font-semibold">
            {valid ? formatDateTime(valid.debut, { capital: true }) : "Choisissez un horaire"}
          </p>
        </Card>
      </div>

      {valid && (
        <form action={rescheduleAppointment} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="creneau" value={valid.id} />
          <Button type="submit" size="lg" className="h-14 text-lg">
            <Icon name="check" className="size-5" />
            Je confirme le changement
          </Button>
        </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Disponibilités de {a.conciliateur.nom}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <WeekNavigator week={week} days={days} hrefFor={(w) => href({ semaine: w, creneau })} />
          <WeekSlots
            days={days}
            slots={slots}
            selectedId={valid?.id}
            hrefFor={(s) => href({ creneau: s.id })}
          />
        </CardContent>
      </Card>
    </>
  );
}
