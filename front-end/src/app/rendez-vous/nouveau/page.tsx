import Link from "next/link";
import { Suspense } from "react";
import { bookAppointment } from "@/app/actions/appointments";
import { Checklist } from "@/components/appointments";
import { ChoiceCard, Stepper, Summary, SummaryRow } from "@/components/booking";
import { BackLink, Container } from "@/components/layout";
import { ConciliateurAvatar, slotButtonClasses } from "@/components/conciliateurs";
import {
  Alert,
  Button,
  buttonClasses,
  Card,
  Field,
  Icon,
  Input,
  Textarea,
  type IconName,
  type Tone,
} from "@/components/ui";
import { lastContact } from "@/lib/api/appointments";
import { getConciliateur, getNextSlots, getSlot, parseSlotId } from "@/lib/api/conciliateurs";
import { getPlatformSettings } from "@/lib/api/reglages";
import { DOMAINES, MOTIF_AUTRE, rappelsTexte } from "@/lib/api/referentiel";
import type { Domaine, Conciliateur, Slot } from "@/lib/api/types";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime, formatDay, formatTime } from "@/lib/format";
import { param, withParams, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Prendre rendez-vous" };

const STEPS = ["Motif", "Vérification"];

const MOTIF_STYLE: Record<Domaine | "autre", { icon: IconName; tone: Tone }> = {
  voisinage: { icon: "users", tone: "amber" },
  logement: { icon: "building", tone: "sky" },
  consommation: { icon: "file", tone: "emerald" },
  impayes: { icon: "file", tone: "rose" },
  travaux: { icon: "building", tone: "violet" },
  commercial: { icon: "briefcase", tone: "indigo" },
  autre: { icon: "message", tone: "sky" },
};

export default function NouveauRendezVousPage({ searchParams }: PageProps<"/rendez-vous/nouveau">) {
  return (
    <Container className="py-8 sm:py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy>
          <span className="sr-only">Chargement…</span>
        </div>}>
        <Tunnel searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Tunnel({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [user, settings] = await Promise.all([requireClient(), getPlatformSettings()]);
  const creneau = param(sp, "creneau") ?? "";
  const parsed = parseSlotId(creneau);
  const conciliateur = parsed ? await getConciliateur(parsed.conciliateurId) : null;

  if (!parsed || !conciliateur) {
    return (
      <Alert title="Ce créneau n'existe pas">
        <Link href="/conciliateurs" className="font-semibold underline">
          Retourner à la recherche de conciliateurs
        </Link>
      </Alert>
    );
  }

  const motifParam = param(sp, "motif");
  const motif = motifParam && (motifParam in DOMAINES || motifParam === "autre")
    ? (motifParam as Domaine | "autre")
    : undefined;
  const url = (extra: Record<string, string | undefined>) =>
    withParams("/rendez-vous/nouveau", { creneau, motif, ...extra });
  const slot = await getSlot(creneau);

  if (!slot) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <BackLink href={`/conciliateurs/${conciliateur.id}`}>Retour aux disponibilités</BackLink>
        <h1 className="text-3xl">Prendre rendez-vous avec {conciliateur.nom}</h1>
        <Unavailable conciliateur={conciliateur} url={(id) => url({ creneau: id, etape: param(sp, "etape") })} />
      </div>
    );
  }

  const etape = !motif ? 0 : 1;
  const duree = Math.round((new Date(slot.fin).getTime() - new Date(slot.debut).getTime()) / 60_000);
  const erreur = param(sp, "erreur");
  const precedent = etape === 1 ? await lastContact() : undefined;
  const contact = {
    prenom: param(sp, "prenom") ?? precedent?.prenom ?? user.prenom,
    nom: param(sp, "nom") ?? precedent?.nom ?? user.nom,
    telephone: precedent?.telephone ?? "",
  };

  const summary = (
    <Card className="overflow-hidden">
      <p className="bg-primary px-5 py-3 text-base font-semibold text-white">Votre rendez-vous</p>
      <div className="flex items-center gap-4 p-5">
        <ConciliateurAvatar nom={conciliateur.nom} className="size-14 text-lg" />
        <div>
          <p className="text-lg font-bold">{conciliateur.nom}</p>
          <p className="text-base text-muted-foreground">{conciliateur.ville}</p>
        </div>
      </div>
      <dl className="flex flex-col gap-3 border-t border-border p-5 text-base">
        <div className="flex gap-3">
          <Icon name="calendar" className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <dt className="sr-only">Date</dt>
            <dd className="font-semibold">{formatDateTime(slot.debut, { capital: true })}</dd>
          </div>
        </div>
        <div className="flex gap-3">
          <Icon name="mapPin" className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <dt className="sr-only">Lieu</dt>
            <dd>{slot.lieu}</dd>
          </div>
        </div>
        {motif && (
          <div className="flex gap-3">
            <Icon name="message" className="mt-1 size-5 shrink-0 text-primary" />
            <div>
              <dt className="sr-only">Motif</dt>
              <dd>{motif === "autre" ? MOTIF_AUTRE.motif : DOMAINES[motif].motif}</dd>
            </div>
          </div>
        )}
      </dl>
    </Card>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <aside className="lg:sticky lg:top-24 lg:order-2">{summary}</aside>
      <div className="flex flex-col gap-6 lg:order-1">
      <BackLink href={etape === 0 ? `/conciliateurs/${conciliateur.id}` : url({ motif: undefined })}>
        {etape === 0 ? "Retour aux disponibilités" : "Étape précédente"}
      </BackLink>

      <Stepper steps={STEPS} current={etape} />

      {etape === 0 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">Pour quelle raison souhaitez-vous ce rendez-vous ?</h1>
          <div className="flex flex-col gap-3">
            {[...(conciliateur.domaines.length ? conciliateur.domaines : (Object.keys(DOMAINES) as Domaine[])), "autre" as const].map((d) => (
              <ChoiceCard
                key={d}
                href={url({ motif: d })}
                {...MOTIF_STYLE[d]}
                title={d === "autre" ? MOTIF_AUTRE.motif : DOMAINES[d].motif}
              />
            ))}
          </div>
        </section>
      )}

      {etape === 1 && motif && (
        <section className="flex flex-col gap-5">
          <h1 className="text-3xl">Vérifiez votre rendez-vous</h1>

          {erreur === "limite" && (
            <Alert variant="warning" title={`Vous avez déjà ${settings.maxRdvAVenir} rendez-vous à venir`}>
              <p className="mt-1">
                C&apos;est le maximum autorisé. Annulez un rendez-vous dans{" "}
                <Link href="/mes-rendez-vous" className="font-semibold underline">
                  Mes rendez-vous
                </Link>{" "}
                ou appelez le {settings.numeroAide}.
              </p>
            </Alert>
          )}
          {erreur === "pris" && <Unavailable conciliateur={conciliateur} url={(id) => url({ creneau: id, etape: "recap" })} />}
          {erreur && !["limite", "pris", "coordonnees", "telephone"].includes(erreur) && (
            <Alert variant="destructive" title="Le rendez-vous n'a pas pu être enregistré">
              Réessayez, ou appelez le {settings.numeroAide}.
            </Alert>
          )}

          <Card className="px-6 py-1">
            <Summary>
              <SummaryRow icon="calendar" label="Date et heure">
                {formatDay(slot.debut, { capital: true })} à {formatTime(slot.debut)}
                <span className="block text-sm font-normal text-muted-foreground">Durée : {duree} minutes</span>
              </SummaryRow>
              <SummaryRow icon="users" label="Conciliateur">
                {conciliateur.nom}
              </SummaryRow>
              <SummaryRow icon="mapPin" label="Lieu">
                {slot.lieu}
              </SummaryRow>
              <SummaryRow icon="message" label="Motif">
                {motif === "autre" ? MOTIF_AUTRE.motif : DOMAINES[motif].motif}
              </SummaryRow>
            </Summary>
          </Card>

          <form action={bookAppointment} className="flex flex-col gap-5">
            <input type="hidden" name="creneau" value={slot.id} />
            <input type="hidden" name="motif" value={motif} />

            <Card className="flex flex-col gap-5 p-6">
              <div>
                <h2 className="text-xl font-semibold">Vos coordonnées</h2>
                <p className="text-base text-muted-foreground">
                  Le conciliateur les utilise pour vous joindre. Personne d&apos;autre ne les voit.
                </p>
              </div>
              {(erreur === "coordonnees" || erreur === "telephone") && (
                <Alert variant="destructive" title="Vérifiez vos coordonnées">
                  Le prénom, le nom et un numéro de téléphone à 10 chiffres sont obligatoires.
                </Alert>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="prenom" label="Prénom">
                  <Input id="prenom" name="prenom" autoComplete="given-name" defaultValue={contact.prenom} required />
                </Field>
                <Field id="nom" label="Nom">
                  <Input id="nom" name="nom" autoComplete="family-name" defaultValue={contact.nom} required />
                </Field>
              </div>
              <Field id="telephone" label="Téléphone" hint="Par exemple 06 12 34 56 78">
                <Input id="telephone" name="telephone" type="tel" autoComplete="tel" defaultValue={contact.telephone} className="sm:w-80" required />
              </Field>
              <Field id="precision" label="En quelques mots (facultatif)" hint="Ce qui vous aidera à expliquer votre situation.">
                <Textarea id="precision" name="precision" defaultValue={param(sp, "precision") ?? ""} maxLength={500} />
              </Field>
              <p className="text-sm text-muted-foreground">{rappelsTexte(settings)}</p>
            </Card>

            <Checklist mode="sur_place" />

            <Button type="submit" size="lg" className="h-14 text-lg">
              <Icon name="check" className="size-5" />
              Je confirme mon rendez-vous
            </Button>
            <Link
              href={`/conciliateurs/${conciliateur.id}`}
              className={buttonClasses({ variant: "ghost", size: "lg" })}
            >
              Choisir un autre horaire
            </Link>
          </form>
        </section>
      )}
      </div>
    </div>
  );
}

async function Unavailable({ conciliateur, url }: { conciliateur: Pick<Conciliateur, "id">; url: (slotId: string) => string }) {
  const next: Slot[] = await getNextSlots(conciliateur.id);
  return (
    <Alert variant="warning" title="Ce créneau n'est plus disponible">
      {next.length > 0 ? (
        <>
          <p className="mt-1 text-foreground">Voici les prochains horaires libres :</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {next.map((s) => (
              <Link key={s.id} href={url(s.id)} className={`${slotButtonClasses} justify-center bg-card`}>
                {formatDateTime(s.debut, { capital: true })}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1 text-foreground">Il n&apos;a plus d&apos;horaire libre en ligne pour le moment.</p>
      )}
    </Alert>
  );
}
