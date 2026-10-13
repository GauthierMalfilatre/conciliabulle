import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addSeanceAction, closeDossierAction, moveSeanceAction } from "@/app/actions/pro";
import { PrintButton } from "@/components/appointments";
import { MODE_ICONS } from "@/components/conciliateurs";
import { BackLink, Container } from "@/components/layout";
import { DossierStatusBadge } from "@/components/pro";
import { Alert, Badge, Button, Card, Field, Icon, Input, Select } from "@/components/ui";
import { getProDossier, getProfil } from "@/lib/api/pro";
import { DOMAINES, MODES } from "@/lib/api/referentiel";
import { requirePro } from "@/lib/auth/session";
import { dayKey, formatDateTime, formatShortDate, timeValue } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Dossier de conciliation" };

export default function ProDossierPage({ params, searchParams }: PageProps<"/pro/dossiers/[id]">) {
  return (
    <Container className="flex max-w-4xl flex-col gap-6 py-8 sm:py-10">
      <BackLink href="/pro/dossiers">Dossiers</BackLink>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { conciliateurId } = await requirePro();
  const [d, profil] = await Promise.all([getProDossier(conciliateurId, id), getProfil(conciliateurId)]);
  if (!d || !profil) notFound();
  const enCours = d.statut === "en_cours";
  const today = dayKey(new Date().toISOString());

  return (
    <>
      {param(sp, "ouvert") && (
        <Alert variant="success" title="Dossier ouvert">
          Remettez à chaque partie son code personnel (imprimez cette page) puis fixez une réunion.
        </Alert>
      )}
      {param(sp, "ajoutee") && <Alert variant="success" title="Réunion ajoutée">Les parties qui ont rejoint le dossier la voient en ligne.</Alert>}
      {param(sp, "deplacee") && <Alert variant="success" title="Réunion déplacée">La demande de changement est close.</Alert>}
      {param(sp, "clos") && <Alert variant="info" title="Dossier clos" />}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <div>
        <p className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
          Dossier n° {d.reference} · ouvert le {formatShortDate(d.ouvertLe)} <DossierStatusBadge statut={d.statut} />
        </p>
        <h1 className="mt-1 text-3xl">Conciliation · {DOMAINES[d.objet].label}</h1>
        {d.rendezVousId && (
          <Link href={`/pro/rendez-vous/${d.rendezVousId}`} className="text-base font-semibold text-primary hover:underline">
            Rendez-vous d&apos;origine
          </Link>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Parties et codes personnels</h2>
          <div className="print:hidden">
            <PrintButton />
          </div>
        </div>
        <p className="mt-1 text-base text-muted-foreground">
          Chaque partie rejoint le dossier en ligne avec son propre code (à remettre en main propre ou par courrier).
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {d.parties.map((p) => (
            <li key={p.role} className="rounded-lg border border-border p-4">
              <p className="text-base text-muted-foreground">Partie {p.role}</p>
              <p className="text-lg font-semibold">{p.nom}</p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-wider">{p.code}</p>
              <Badge variant={p.rejoint ? "success" : "secondary"} className="mt-2">
                {p.rejoint ? "A rejoint le dossier en ligne" : "N'a pas encore rejoint"}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <section className="flex flex-col gap-3 print:hidden" aria-labelledby="reunions">
        <h2 id="reunions" className="text-2xl">Réunions de conciliation</h2>
        {d.seances.length === 0 && <Card className="p-6 text-base text-muted-foreground">Aucune réunion fixée.</Card>}
        {d.seances.map((s) => {
          const pending = s.demande && !s.demande.traiteeLe;
          return (
            <Card key={s.id} id={`seance-${s.id}`} className={pending ? "scroll-mt-24 border-2 border-warning/50 p-5" : "scroll-mt-24 p-5"}>
              <div className="flex flex-wrap items-center gap-3">
                <Icon name={MODE_ICONS[s.mode]} className="size-6 text-primary" />
                <p className="flex-1 text-lg">
                  <strong>{formatDateTime(s.debut, { capital: true })}</strong>
                  <span className="block text-base text-muted-foreground">
                    {s.mode === "sur_place" ? `${profil.lieu}, ${profil.adresse}` : MODES[s.mode].label}
                  </span>
                </p>
                {s.statut === "passee" ? <Badge variant="secondary">Passée</Badge> : pending && <Badge variant="warning">Changement demandé</Badge>}
              </div>
              {pending && s.demande!.message && (
                <blockquote className="mt-3 border-l-4 border-border pl-4 text-base italic">« {s.demande!.message} »</blockquote>
              )}
              {enCours && s.statut === "prevue" && (
                <details className="group mt-3" open={Boolean(pending)}>
                  <summary className="w-fit cursor-pointer list-none rounded-lg py-1 text-base font-semibold text-primary hover:underline">
                    Déplacer cette réunion
                  </summary>
                  <form action={moveSeanceAction} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="dossier" value={d.id} />
                    <input type="hidden" name="seance" value={s.id} />
                    <Field id={`date-${s.id}`} label="Nouvelle date">
                      <Input id={`date-${s.id}`} name="date" type="date" min={today} defaultValue={dayKey(s.debut)} required />
                    </Field>
                    <Field id={`heure-${s.id}`} label="Heure">
                      <Input id={`heure-${s.id}`} name="heure" type="time" step={900} defaultValue={timeValue(s.debut)} required />
                    </Field>
                    <Button type="submit">Déplacer</Button>
                  </form>
                </details>
              )}
            </Card>
          );
        })}
      </section>

      {enCours && (
        <div className="grid gap-6 md:grid-cols-2 print:hidden">
          <Card className="p-6">
            <h2 className="text-xl">Ajouter une réunion</h2>
            <form action={addSeanceAction} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="dossier" value={d.id} />
              <div className="grid grid-cols-2 gap-3">
                <Field id="date" label="Date">
                  <Input id="date" name="date" type="date" min={today} required />
                </Field>
                <Field id="heure" label="Heure">
                  <Input id="heure" name="heure" type="time" step={900} defaultValue="10:00" required />
                </Field>
              </div>
              <Field id="mode" label="Type">
                <Select id="mode" name="mode" defaultValue="sur_place">
                  {Object.entries(MODES).map(([code, m]) => (
                    <option key={code} value={code}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" className="self-start">
                <Icon name="plus" /> Ajouter la réunion
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl">Clore le dossier</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Les parties sont informées de l&apos;issue dans leur espace.
            </p>
            <form action={closeDossierAction} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="dossier" value={d.id} />
              <Field id="issue" label="Issue">
                <Select id="issue" name="issue" defaultValue="accord">
                  <option value="accord">Accord trouvé (constat d&apos;accord signé)</option>
                  <option value="echec">Pas d&apos;accord (attestation remise)</option>
                </Select>
              </Field>
              <Button type="submit" variant="outline" className="self-start">
                Clore le dossier
              </Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
