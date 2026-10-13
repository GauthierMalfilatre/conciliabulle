import Link from "next/link";
import { Suspense } from "react";
import { saveParametresAction } from "@/app/actions/pro";
import { AvailabilityGrid } from "@/components/conciliateurs";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs, TimeSelect } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Input, Select } from "@/components/ui";
import { getWeekSlots } from "@/lib/api/conciliateurs";
import { getParametres } from "@/lib/api/pro";
import { getPlatformSettings } from "@/lib/api/reglages";
import { HORIZON_SEMAINES, JOURS } from "@/lib/api/referentiel";
import type { Weekday } from "@/lib/api/types";
import { requirePro } from "@/lib/auth/session";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mes horaires" };

export default function ParametresPage({ searchParams }: PageProps<"/pro/parametres">) {
  return (
    <>
      <ProBand title="Paramètres">
        <SettingsTabs current="/pro/parametres" />
      </ProBand>
      <Container className="flex max-w-4xl flex-col gap-6 py-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <Horaires searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function Horaires({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { conciliateurId } = await requirePro();
  const [p, apercu, platform] = await Promise.all([getParametres(), getWeekSlots(conciliateurId, 0), getPlatformSettings()]);
  const durees = platform.dureesRdvAutorisees.includes(p.dureeMinutes)
    ? platform.dureesRdvAutorisees
    : [...platform.dureesRdvAutorisees, p.dureeMinutes].sort((a, b) => a - b);

  return (
    <>
      {param(sp, "enregistre") && <Alert variant="success" title="Horaires enregistrés">Vos créneaux en ligne sont mis à jour.</Alert>}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <form action={saveParametresAction} className="flex flex-col gap-6">
        <Card className="p-6">
          <h2 className="text-2xl">Horaires de permanence</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Cochez les demi-journées où vous recevez, et réglez les heures. Les horaires sont publiés
            {` ${HORIZON_SEMAINES} `}semaines à l&apos;avance. Les rendez-vous déjà pris ne changent pas.
          </p>
          <div className="mt-5 flex flex-col divide-y divide-border">
            {([1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
              <div key={d} role="group" aria-labelledby={`jour-${d}`} className="grid gap-3 py-4 lg:grid-cols-[7rem_1fr_1fr] lg:items-center">
                <p id={`jour-${d}`} className="text-lg font-semibold">{JOURS[d]}</p>
                {(["matin", "apres"] as const).map((part) => {
                  const plage = part === "matin" ? p.horaires[d].matin : p.horaires[d].apresMidi;
                  const label = part === "matin" ? "Matin" : "Après-midi";
                  return (
                    <div key={part} className="flex flex-wrap items-center gap-2">
                      <label className="flex min-h-11 w-32 cursor-pointer items-center gap-2 text-base font-medium">
                        <input type="checkbox" name={`j${d}-${part}-actif`} defaultChecked={plage.actif} className="size-5 accent-[#0f6cbd]" />
                        {label}
                      </label>
                      <TimeSelect name={`j${d}-${part}-debut`} defaultValue={plage.debut} label={`${JOURS[d]} ${label} : début`} />
                      <span aria-hidden>à</span>
                      <TimeSelect name={`j${d}-${part}-fin`} defaultValue={plage.fin} label={`${JOURS[d]} ${label} : fin`} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid gap-5 p-6 md:grid-cols-[16rem_1fr]">
          <h2 className="text-2xl md:col-span-2">Rendez-vous</h2>
          <Field id="duree" label="Durée d'un rendez-vous">
            <Select id="duree" name="duree" defaultValue={String(p.dureeMinutes)}>
              {durees.map((d) => (
                <option key={d} value={d}>
                  {d === 60 ? "1 heure" : d === 90 ? "1 h 30" : `${d} minutes`}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="lieu" label="Lieu des rendez-vous" hint="Adresse et salle, telles que les justiciables les verront.">
            <Input id="lieu" name="lieu" defaultValue={p.lieu} placeholder="Ex. : Mairie du 3e, salle des permanences" required />
          </Field>
        </Card>

        <Button type="submit" size="lg" className="h-14 self-start px-8 text-lg">
          <Icon name="check" className="size-5" /> Enregistrer mes horaires
        </Button>
      </form>

      <Card className="p-6">
        <h2 className="text-2xl">Ce que voient les justiciables</h2>
        <p className="mt-1 mb-5 text-base text-muted-foreground">
          Vos créneaux libres des 7 prochains jours.{" "}
          <Link href={`/conciliateurs/${conciliateurId}`} className="font-semibold text-primary hover:underline">
            Voir ma fiche publique
          </Link>
        </p>
        {apercu.slots.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-base">Aucun créneau libre sur cette période.</p>
        ) : (
          <AvailabilityGrid days={apercu.days} slots={apercu.slots} hrefFor={() => `/conciliateurs/${conciliateurId}`} />
        )}
      </Card>
    </>
  );
}
