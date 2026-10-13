import Link from "next/link";
import { Suspense } from "react";
import { closePeriodAction } from "@/app/actions/pro";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Input } from "@/components/ui";
import { nextOpenDays } from "@/lib/api/pro";
import { ymd } from "@/lib/api/schedule";
import { requirePro } from "@/lib/auth/session";
import { formatDay } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mes absences" };

export default function AbsencesPage({ searchParams }: PageProps<"/pro/parametres/absences">) {
  return (
    <>
      <ProBand title="Paramètres">
        <SettingsTabs current="/pro/parametres/absences" />
      </ProBand>
      <Container className="flex max-w-3xl flex-col gap-6 py-8">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <Absences searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function Absences({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  await requirePro();
  const jours = await nextOpenDays();
  const today = ymd(new Date());
  const retires = param(sp, "retires");
  const reserves = Number(param(sp, "reserves")) || 0;

  return (
    <>
      {retires !== undefined && (
        <Alert variant="success" title={`${retires} horaire${Number(retires) > 1 ? "s" : ""} retiré${Number(retires) > 1 ? "s" : ""} de la réservation en ligne`}>
          Ces jours ne sont plus proposés aux justiciables.
        </Alert>
      )}
      {reserves > 0 && (
        <Alert variant="warning" title={`${reserves} rendez-vous déjà pris pendant cette période`}>
          <p className="mt-1">
            Ils sont conservés. Appelez les personnes pour les prévenir :{" "}
            <Link href="/pro/agenda" className="font-semibold underline">
              voir l&apos;agenda
            </Link>
            .
          </p>
        </Alert>
      )}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <Card className="p-6">
        <h2 className="text-2xl">Fermer des jours</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Congés, formation, maladie : les horaires libres de ces jours sont retirés. Pour les rouvrir plus tard,
          ajoutez une permanence dans l&apos;onglet Horaires.
        </p>
        <form action={closePeriodAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field id="du" label="Du">
            <Input id="du" name="du" type="date" min={today} required />
          </Field>
          <Field id="au" label="Au (inclus)">
            <Input id="au" name="au" type="date" min={today} />
          </Field>
          <Button type="submit" size="lg" className="sm:col-span-2 sm:justify-self-start">
            <Icon name="x" className="size-5" /> Fermer ces jours
          </Button>
        </form>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="ouverts">
        <h2 id="ouverts" className="text-2xl">Prochains jours ouverts à la réservation</h2>
        {jours.length === 0 ? (
          <Card className="p-6 text-base text-muted-foreground">Aucun horaire libre en ligne.</Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {jours.map((j) => (
                <li key={j.date} className="flex flex-wrap items-center gap-x-3 px-5 py-3 text-base">
                  <span className="font-semibold">{formatDay(j.date, { capital: true })}</span>
                  <span className="text-muted-foreground">
                    {j.premier.replace(":", " h ")} – {j.dernier.replace(":", " h ")} · {j.libres} horaire{j.libres > 1 ? "s" : ""} libre{j.libres > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
