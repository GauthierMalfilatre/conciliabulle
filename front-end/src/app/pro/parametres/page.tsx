import Link from "next/link";
import { Suspense } from "react";
import { saveParametresAction, toggleReservationAction } from "@/app/actions/pro";
import { AvailabilityGrid } from "@/components/conciliateurs";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs, TimeSelect } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Select } from "@/components/ui";
import { getWeekSlots } from "@/lib/api/conciliateurs";
import { getParametres, getProfil } from "@/lib/api/pro";
import { getPlatformSettings } from "@/lib/api/reglages";
import { DELAIS_MIN_HEURES, HORIZONS_SEMAINES, JOURS } from "@/lib/api/referentiel";
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

const DELAI_LABEL: Record<number, string> = { 2: "2 heures avant", 24: "La veille (24 h avant)", 48: "2 jours avant" };

async function Horaires({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { conciliateurId } = await requirePro();
  const [p, profil, apercu, platform] = await Promise.all([
    getParametres(conciliateurId),
    getProfil(conciliateurId),
    getWeekSlots(conciliateurId, 0),
    getPlatformSettings(),
  ]);
  const ouverte = profil?.reservationOuverte ?? false;

  return (
    <>
      {param(sp, "enregistre") && <Alert variant="success" title="Horaires enregistrés">Vos créneaux en ligne sont mis à jour.</Alert>}
      {param(sp, "reservation") === "pause" && <Alert variant="warning" title="Réservations en pause">Plus personne ne peut réserver en ligne.</Alert>}
      {param(sp, "reservation") === "ouverte" && <Alert variant="success" title="Réservations rouvertes" />}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <span className={ouverte ? "grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800" : "grid size-12 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800"}>
          <Icon name={ouverte ? "check" : "pause"} className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-xl">Réservation en ligne {ouverte ? "ouverte" : "en pause"}</h2>
          <p className="text-base text-muted-foreground">
            {ouverte
              ? "Les justiciables peuvent réserver selon les horaires ci-dessous."
              : "Votre fiche reste visible, mais personne ne peut réserver."}
          </p>
        </div>
        <form action={toggleReservationAction}>
          <input type="hidden" name="ouverte" value={ouverte ? "0" : "1"} />
          <Button type="submit" variant={ouverte ? "outline" : "primary"} size="lg">
            <Icon name={ouverte ? "pause" : "play"} className="size-5" />
            {ouverte ? "Mettre en pause" : "Rouvrir"}
          </Button>
        </form>
      </Card>

      <form action={saveParametresAction} className="flex flex-col gap-6">
        <Card className="p-6">
          <h2 className="text-2xl">Horaires de permanence</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Cochez les demi-journées où vous recevez, et réglez les heures.
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

        <Card className="grid gap-5 p-6 md:grid-cols-3">
          <h2 className="text-2xl md:col-span-3">Rendez-vous</h2>
          <Field id="duree" label="Durée d'un rendez-vous">
            <Select id="duree" name="duree" defaultValue={String(p.dureeMinutes)}>
              {platform.dureesRdvAutorisees.map((d) => (
                <option key={d} value={d}>
                  {d === 60 ? "1 heure" : d === 90 ? "1 h 30" : `${d} minutes`}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="delai" label="Réservation possible jusqu'à">
            <Select id="delai" name="delai" defaultValue={String(p.delaiMinHeures)}>
              {DELAIS_MIN_HEURES.map((d) => (
                <option key={d} value={d}>
                  {DELAI_LABEL[d]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="horizon" label="Réservation ouverte sur">
            <Select id="horizon" name="horizon" defaultValue={String(p.horizonSemaines)}>
              {HORIZONS_SEMAINES.map((w) => (
                <option key={w} value={w}>
                  {w} semaines
                </option>
              ))}
            </Select>
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
