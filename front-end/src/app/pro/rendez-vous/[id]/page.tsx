import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { saveNoteAction, setPresenceAction } from "@/app/actions/pro";
import { Summary, SummaryRow } from "@/components/booking";
import { BackLink, Container } from "@/components/layout";
import { AppointmentStatusBadge } from "@/components/pro";
import { Alert, Button, buttonClasses, Card, Field, Icon, Textarea } from "@/components/ui";
import { getProAppointment } from "@/lib/api/pro";
import { requirePro } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDay, formatTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Rendez-vous" };

export default function ProRendezVousPage({ params, searchParams }: PageProps<"/pro/rendez-vous/[id]">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-10">
      <BackLink href="/pro/agenda">Agenda</BackLink>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requirePro();
  const a = await getProAppointment(id);
  if (!a) notFound();
  const tel = a.client.telephone;
  const started = a.statut !== "a_venir";

  return (
    <>
      {param(sp, "note") && <Alert variant="success" title="Note enregistrée" />}
      {param(sp, "presence") && <Alert variant="success" title="Présence enregistrée" />}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <Card className="overflow-hidden">
        <div className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-4", a.statut === "annule" ? "bg-muted" : "bg-primary text-white")}>
          <h1 className="text-2xl sm:text-3xl">
            {formatDay(a.debut, { capital: true })} à {formatTime(a.debut)}
          </h1>
          <AppointmentStatusBadge statut={a.statut} />
        </div>
        <div className="px-6 py-1">
          <Summary>
            <SummaryRow icon="users" label="Justiciable">
              {a.client.nom}
              <a href={`tel:${tel.replaceAll(" ", "")}`} className="block font-normal text-primary hover:underline">
                {tel}
              </a>
            </SummaryRow>
            {a.motif && (
              <SummaryRow icon="message" label="Motif">
                {a.motif}
              </SummaryRow>
            )}
            <SummaryRow icon="mapPin" label="Lieu">
              {a.lieu}
            </SummaryRow>
            <SummaryRow icon="clock" label="Durée">
              De {formatTime(a.debut)} à {formatTime(a.fin)}
            </SummaryRow>
          </Summary>
        </div>
      </Card>

      {a.statut === "annule" && <Alert variant="info" title="Annulé par le justiciable" />}

      {a.statut !== "annule" && started && (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-xl">Le rendez-vous a-t-il eu lieu ?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["honore", "absent"] as const).map((p) => (
              <form key={p} action={setPresenceAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="presence" value={p} />
                <Button
                  type="submit"
                  size="lg"
                  variant={a.statut === p ? (p === "honore" ? "primary" : "destructive") : "outline"}
                  className="w-full"
                  aria-pressed={a.statut === p}
                >
                  <Icon name={p === "honore" ? "check" : "x"} className="size-5" />
                  {p === "honore" ? "Oui, la personne est venue" : "Non, la personne est absente"}
                </Button>
              </form>
            ))}
          </div>
        </Card>
      )}

      {a.statut !== "annule" && (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-xl">Dossier de conciliation</h2>
          {a.dossierId ? (
            <Link href={`/pro/dossiers/${a.dossierId}`} className={buttonClasses({ variant: "outline", size: "lg" })}>
              <Icon name="file" className="size-5" /> Voir le dossier
            </Link>
          ) : (
            <>
              <p className="text-base text-muted-foreground">
                Si une réunion avec l&apos;autre partie est utile, ouvrez un dossier : vous obtiendrez les codes
                personnels à remettre à chacun.
              </p>
              <Link href={`/pro/dossiers/nouveau?rdv=${a.id}`} className={buttonClasses({ size: "lg" })}>
                <Icon name="plus" className="size-5" /> Ouvrir un dossier
              </Link>
            </>
          )}
        </Card>
      )}

      <Card className="p-6">
        <form action={saveNoteAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={a.id} />
          <Field id="note" label="Note personnelle (visible par vous seul)">
            <Textarea id="note" name="note" defaultValue={a.note} placeholder="Ex. : apporter le bail au prochain rendez-vous." />
          </Field>
          <Button type="submit" variant="outline" className="self-start">
            Enregistrer la note
          </Button>
        </form>
      </Card>

      {a.statut === "a_venir" && (
        <p className="text-base text-muted-foreground">
          Pour annuler ou déplacer ce rendez-vous, appelez la personne : elle peut le faire en ligne jusqu&apos;à 24 heures avant.
        </p>
      )}
    </>
  );
}
