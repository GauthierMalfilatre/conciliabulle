import Link from "next/link";
import { Suspense } from "react";
import { bookAppointment } from "@/app/actions/appointments";
import { Checklist } from "@/components/appointments";
import { ChoiceCard, Stepper, Summary, SummaryRow } from "@/components/booking";
import { BackLink, Container } from "@/components/layout";
import { MODE_ICONS, ConciliateurAvatar, slotButtonClasses } from "@/components/conciliateurs";
import {
  Alert,
  Button,
  buttonClasses,
  Card,
  Icon,
  type IconName,
  type Tone,
} from "@/components/ui";
import { getConciliateur, getNextSlots, getSlot } from "@/lib/api/conciliateurs";
import { getPlatformSettings } from "@/lib/api/reglages";
import { DOMAINES, MODES, MOTIF_AUTRE, rappelsTexte } from "@/lib/api/referentiel";
import type { Domaine, Conciliateur, Mode, Slot } from "@/lib/api/types";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime, formatDay, formatTime } from "@/lib/format";
import { param, withParams, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Prendre rendez-vous" };

const STEPS = ["Motif", "Type de rendez-vous", "Vérification"];

const MOTIF_STYLE: Record<Domaine | "autre", { icon: IconName; tone: Tone }> = {
  voisinage: { icon: "users", tone: "amber" },
  logement: { icon: "building", tone: "sky" },
  consommation: { icon: "file", tone: "emerald" },
  impayes: { icon: "file", tone: "rose" },
  travaux: { icon: "building", tone: "violet" },
  commercial: { icon: "briefcase", tone: "indigo" },
  autre: { icon: "message", tone: "sky" },
};

const MODE_TONES: Record<Mode, Tone> = { sur_place: "indigo", telephone: "emerald", visio: "violet" };

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
  const creneau = param(sp, "creneau");
  const found = creneau ? await getSlot(creneau) : null;
  const conciliateur = found ? await getConciliateur(found.slot.conciliateurId) : null;

  if (!found || !conciliateur) {
    return (
      <Alert title="Ce créneau n'existe pas">
        <Link href="/conciliateurs" className="font-semibold underline">
          Retourner à la recherche de conciliateurs
        </Link>
      </Alert>
    );
  }

  const { slot } = found;
  const motifParam = param(sp, "motif");
  const motif = motifParam && (motifParam in DOMAINES || motifParam === "autre")
    ? (motifParam as Domaine | "autre")
    : undefined;
  const modeParam = param(sp, "mode") as Mode | undefined;
  const mode = modeParam && conciliateur.modes.includes(modeParam) ? modeParam : undefined;
  const etape = !motif ? 0 : !mode || param(sp, "etape") !== "recap" ? 1 : 2;
  const url = (extra: Record<string, string | undefined>) =>
    withParams("/rendez-vous/nouveau", { creneau: slot.id, motif, mode, ...extra });

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
        {mode && (
          <div className="flex gap-3">
            <Icon name={MODE_ICONS[mode]} className="mt-1 size-5 shrink-0 text-primary" />
            <div>
              <dt className="sr-only">Type de rendez-vous</dt>
              <dd>{mode === "sur_place" ? `${conciliateur.lieu}, ${conciliateur.adresse}` : MODES[mode].label}</dd>
            </div>
          </div>
        )}
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
      <BackLink
        href={
          etape === 0
            ? `/conciliateurs/${conciliateur.id}`
            : etape === 1
              ? url({ motif: undefined, mode: undefined })
              : url({ etape: undefined })
        }
      >
        {etape === 0 ? "Retour aux disponibilités" : "Étape précédente"}
      </BackLink>

      <Stepper steps={STEPS} current={etape} />

      {!found.available && etape < 2 && (
        <Unavailable conciliateur={conciliateur} url={(id) => withParams("/rendez-vous/nouveau", { creneau: id, motif, mode })} />
      )}

      {etape === 0 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">Pour quelle raison souhaitez-vous ce rendez-vous ?</h1>
          <div className="flex flex-col gap-3">
            {[...conciliateur.domaines, "autre" as const].map((d) => (
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

      {etape === 1 && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">Comment souhaitez-vous échanger ?</h1>
          <div className="flex flex-col gap-3">
            {/* Phone first: the most comfortable channel for many users. */}
            {(["telephone", "sur_place", "visio"] as const)
              .filter((m) => conciliateur.modes.includes(m))
              .map((m) => (
                <ChoiceCard
                  key={m}
                  href={url({ mode: m, etape: "recap" })}
                  icon={MODE_ICONS[m]}
                  tone={MODE_TONES[m]}
                  title={MODES[m].label}
                  description={m === "sur_place" ? `${conciliateur.lieu}, ${conciliateur.adresse}` : MODES[m].description}
                  selected={m === mode}
                />
              ))}
          </div>
        </section>
      )}

      {etape === 2 && motif && mode && (
        <section className="flex flex-col gap-5">
          <h1 className="text-3xl">Vérifiez votre rendez-vous</h1>

          {param(sp, "erreur") === "limite" && (
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

          {(param(sp, "erreur") === "pris" || !found.available) && (
            <Unavailable conciliateur={conciliateur} url={(id) => url({ creneau: id, etape: "recap" })} />
          )}

          <Card className="px-6 py-1">
            <Summary>
              <SummaryRow icon="calendar" label="Date et heure">
                {formatDay(slot.debut, { capital: true })} à {formatTime(slot.debut)}
                <span className="block text-sm font-normal text-muted-foreground">Durée : {conciliateur.dureeMinutes} minutes</span>
              </SummaryRow>
              <SummaryRow icon="users" label="Conciliateur">
                {conciliateur.nom}
              </SummaryRow>
              <SummaryRow icon={MODE_ICONS[mode]} label="Type de rendez-vous">
                {MODES[mode].label}
                {mode === "sur_place" && (
                  <span className="block font-normal">{conciliateur.lieu}, {conciliateur.adresse}</span>
                )}
                {mode === "telephone" && (
                  <span className="block font-normal">Le conciliateur vous appellera au {user.telephone}</span>
                )}
              </SummaryRow>
              <SummaryRow icon="message" label="Motif">
                {motif === "autre" ? MOTIF_AUTRE.motif : DOMAINES[motif].motif}
              </SummaryRow>
              <SummaryRow icon="phone" label="Vos coordonnées">
                {user.name} · {user.telephone}
                <span className="block text-sm font-normal text-muted-foreground">
                  Vous recevrez un SMS de confirmation. {rappelsTexte(settings)}
                </span>
              </SummaryRow>
            </Summary>
          </Card>

          <Checklist mode={mode} />

          {found.available && (
            <form action={bookAppointment} className="flex flex-col gap-3">
              <input type="hidden" name="creneau" value={slot.id} />
              <input type="hidden" name="motif" value={motif} />
              <input type="hidden" name="mode" value={mode} />
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
          )}
        </section>
      )}
      </div>
    </div>
  );
}

async function Unavailable({ conciliateur, url }: { conciliateur: Conciliateur; url: (slotId: string) => string }) {
  const next: Slot[] = await getNextSlots(conciliateur.id);
  return (
    <Alert variant="warning" title="Ce créneau vient d'être réservé par quelqu'un d'autre">
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
        <p className="mt-1 text-foreground">Appelez le conciliateur au {conciliateur.telephone}.</p>
      )}
    </Alert>
  );
}
