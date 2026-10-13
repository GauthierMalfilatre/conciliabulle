import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Checklist, PrintButton, STATUT_BADGE } from "@/components/appointments";
import { Summary, SummaryRow } from "@/components/booking";
import { BackLink, Container } from "@/components/layout";
import { MODE_ICONS } from "@/components/conciliateurs";
import { Alert, Badge, buttonClasses, Card, Icon } from "@/components/ui";
import { getPlatformSettings } from "@/lib/api/reglages";
import { getAppointment, isModifiable } from "@/lib/api/appointments";
import { DOMAINES, MODES, MOTIF_AUTRE, rappelsTexte } from "@/lib/api/referentiel";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime, formatDay, formatTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mon rendez-vous" };

export default function RendezVousPage({ params, searchParams }: PageProps<"/mes-rendez-vous/[id]">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      <BackLink href="/mes-rendez-vous">Mes rendez-vous</BackLink>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy>
          <span className="sr-only">Chargement…</span>
        </div>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireClient();
  const [a, settings] = await Promise.all([getAppointment(id, user.id), getPlatformSettings()]);
  if (!a) notFound();

  const badge = STATUT_BADGE[a.statut];
  const modifiable = isModifiable(a);
  const tel = a.conciliateur.telephone;

  return (
    <>
      {param(sp, "confirme") && (
        <Alert variant="success" title="Votre rendez-vous est confirmé">
          Un SMS de confirmation vous a été envoyé. {rappelsTexte(settings)}
        </Alert>
      )}
      {param(sp, "modifie") && (
        <Alert variant="success" title="Votre rendez-vous a été déplacé">
          Nouvelle date : {formatDateTime(a.debut)}.
        </Alert>
      )}
      {param(sp, "annule") && (
        <Alert variant="info" title="Votre rendez-vous a été annulé">
          <Link href="/conciliateurs" className="font-semibold underline">
            Prendre un nouveau rendez-vous
          </Link>
        </Alert>
      )}
      {a.annulation?.par === "conciliateur" && (
        <Alert variant="warning" title="Le conciliateur a dû annuler ce rendez-vous">
          {a.annulation.message && <p className="mt-1">« {a.annulation.message} »</p>}
          <p className="mt-1">
            <Link href={`/conciliateurs/${a.conciliateur.id}`} className="font-semibold underline">
              Choisir un nouvel horaire
            </Link>
          </p>
        </Alert>
      )}
      {param(sp, "erreur") === "delai" && a.statut === "confirme" && (
        <Alert variant="warning" title="Ce rendez-vous ne peut plus être modifié en ligne">
          Appelez le conciliateur au {tel}.
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div
          className={
            a.statut === "confirme"
              ? "flex flex-wrap items-center justify-between gap-3 bg-primary px-6 py-4 text-white"
              : "flex flex-wrap items-center justify-between gap-3 bg-muted px-6 py-4"
          }
        >
          <h1 className="text-2xl sm:text-3xl">
            {formatDay(a.debut, { capital: true })} à {formatTime(a.debut)}
          </h1>
          <Badge variant={badge.variant} className="px-3 py-1 text-sm">
            {badge.label}
          </Badge>
        </div>
        <div className="px-6 py-1">
        <Summary>
          <SummaryRow icon="clock" label="Durée">
            De {formatTime(a.debut)} à {formatTime(a.fin)}
          </SummaryRow>
          <SummaryRow icon="users" label="Conciliateur">
            <Link href={`/conciliateurs/${a.conciliateur.id}`} className="hover:underline">
              {a.conciliateur.nom}
            </Link>
          </SummaryRow>
          <SummaryRow icon={MODE_ICONS[a.mode]} label="Type de rendez-vous">
            {MODES[a.mode].label}
            {a.mode === "sur_place" && (
              <span className="block font-normal">
                {a.conciliateur.lieu}, {a.conciliateur.adresse}
              </span>
            )}
            {a.mode === "telephone" && (
              <span className="block font-normal">Le conciliateur vous appellera au {user.telephone}</span>
            )}
          </SummaryRow>
          <SummaryRow icon="message" label="Motif">
            {a.motif === "autre" ? MOTIF_AUTRE.motif : DOMAINES[a.motif].motif}
          </SummaryRow>
          <SummaryRow icon="phone" label="Contacter le conciliateur">
            <a href={`tel:${tel.replaceAll(" ", "")}`} className="hover:underline">
              {tel}
            </a>
          </SummaryRow>
        </Summary>
        </div>
      </Card>

      {a.statut === "confirme" && <Checklist mode={a.mode} />}

      {a.statut === "confirme" && (
        <div className="flex flex-col gap-4 print:hidden">
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={`/mes-rendez-vous/${a.id}/agenda`} className={buttonClasses({ variant: "outline", size: "lg" })}>
              <Icon name="calendar" className="size-5" />
              Ajouter à mon agenda
            </a>
            <PrintButton />
          </div>

          {modifiable ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/mes-rendez-vous/${a.id}/modifier`} className={buttonClasses({ size: "lg" })}>
                Changer la date
              </Link>
              <Link
                href={`/mes-rendez-vous/${a.id}/annuler`}
                className={buttonClasses({ variant: "destructive-outline", size: "lg" })}
              >
                <Icon name="x" className="size-5" />
                Annuler le rendez-vous
              </Link>
            </div>
          ) : (
            <Alert variant="warning" title={`Le rendez-vous a lieu dans moins de ${settings.delaiModificationHeures} heures`}>
              Pour le changer ou l&apos;annuler, appelez le conciliateur au{" "}
              <a href={`tel:${tel.replaceAll(" ", "")}`} className="font-semibold underline">
                {tel}
              </a>
              .
            </Alert>
          )}
        </div>
      )}
    </>
  );
}
