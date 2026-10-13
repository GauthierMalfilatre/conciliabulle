import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { BackLink, Container } from "@/components/layout";
import {
  bookingHref,
  ConciliateurAvatar,
  ModeList,
  parseWeek,
  WeekNavigator,
  WeekSlots,
} from "@/components/conciliateurs";
import { buttonClasses, Card, Icon, type IconName } from "@/components/ui";
import { getConciliateur, getWeekSlots } from "@/lib/api/conciliateurs";
import { DOMAINES } from "@/lib/api/referentiel";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Disponibilités du conciliateur" };

export default function ConciliateurPage({ params, searchParams }: PageProps<"/conciliateurs/[id]">) {
  return (
    <Suspense
      fallback={
        <Container className="py-10" aria-busy>
          <span className="sr-only">Chargement…</span>
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </Container>
      }
    >
      <Conciliateur params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-xl">
        <Icon name={icon} className="size-6 text-primary" />
        {title}
      </h2>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </Card>
  );
}

async function Conciliateur({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const conciliateur = await getConciliateur(id);
  if (!conciliateur) notFound();
  const week = parseWeek(param(sp, "semaine"), conciliateur.horizonSemaines);
  const { days, slots } = await getWeekSlots(id, week);
  const tel = conciliateur.telephone;

  return (
    <>
      <section className="border-b border-border bg-card">
        <Container className="flex flex-col gap-4 py-6">
          <BackLink href="/conciliateurs">Retour à la recherche</BackLink>
          <div className="flex items-center gap-5">
            <ConciliateurAvatar nom={conciliateur.nom} className="size-20 text-2xl sm:size-24 sm:text-3xl" />
            <div>
              <h1 className="text-3xl">{conciliateur.nom}</h1>
              <p className="text-lg">Conciliateur de justice</p>
              <p className="text-base">{conciliateur.domaines.map((d) => DOMAINES[d].label).join(" · ")}</p>
              <p className="flex items-center gap-1.5 text-base text-muted-foreground">
                <Icon name="mapPin" /> {conciliateur.ville} · {conciliateur.region.nom}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-2xl">Prendre rendez-vous</h2>
            {conciliateur.reservationOuverte ? (
              <>
                <p className="mt-1 text-base text-muted-foreground">
                  Choisissez un horaire. Le rendez-vous dure {conciliateur.dureeMinutes} minutes.
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  <WeekNavigator
                    week={week}
                    days={days}
                    maxWeeks={conciliateur.horizonSemaines}
                    hrefFor={(w) => `/conciliateurs/${conciliateur.id}?semaine=${w}`}
                  />
                  <WeekSlots days={days} slots={slots} hrefFor={(s) => bookingHref(s.id)} />
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-lg bg-muted p-4 text-base">
                La prise de rendez-vous en ligne est momentanément suspendue. Appelez le {tel} ou
                demandez à être rappelé.
              </p>
            )}
          </Card>

          <Section icon="message" title="Présentation">
            <p>{conciliateur.presentation}</p>
          </Section>
          <Section icon="check" title="Gratuit">
            <p>
              La conciliation de justice est un service public gratuit. Le conciliateur est un
              bénévole nommé par la cour d&apos;appel : il est neutre et tenu au secret.
            </p>
          </Section>
          <Section icon="languages" title="Langues parlées">
            <p>{conciliateur.langues.join(", ")}</p>
          </Section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Card className="p-6">
            <h2 className="text-xl">Informations pratiques</h2>
            <dl className="mt-4 flex flex-col gap-4 text-base">
              <div className="flex gap-3">
                <Icon name="mapPin" className="mt-1 size-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold">Lieu de permanence</dt>
                  <dd>{conciliateur.lieu}</dd>
                  <dd>{conciliateur.adresse}</dd>
                  {conciliateur.accesPMR && (
                    <dd className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
                      <Icon name="accessible" /> Accessible en fauteuil roulant
                    </dd>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Icon name="phone" className="mt-1 size-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold">Téléphone</dt>
                  <dd>
                    <a href={`tel:${tel.replaceAll(" ", "")}`} className="hover:underline">
                      {tel}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Icon name="calendar" className="mt-1 size-5 shrink-0 text-primary" />
                <div>
                  <dt className="font-semibold">Rendez-vous possibles</dt>
                  <dd className="mt-1">
                    <ModeList modes={conciliateur.modes} />
                  </dd>
                </div>
              </div>
            </dl>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <p className="text-base">
              <strong>Vous préférez en parler d&apos;abord ?</strong> Laissez votre numéro, le conciliateur vous rappelle.
            </p>
            <Link
              href={`/etre-rappele?conciliateur=${conciliateur.id}`}
              className={buttonClasses({ variant: "outline", size: "lg" })}
            >
              <Icon name="phone" className="size-5" />
              Être rappelé
            </Link>
          </Card>
        </aside>
      </Container>
    </>
  );
}
