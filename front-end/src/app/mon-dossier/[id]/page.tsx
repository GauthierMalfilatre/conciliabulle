import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, Container } from "@/components/layout";
import { MODE_ICONS } from "@/components/conciliateurs";
import { Alert, Badge, buttonClasses, Card, Icon } from "@/components/ui";
import { getDossier } from "@/lib/api/dossiers";
import { DOMAINES, MODES } from "@/lib/api/referentiel";
import { requireClient } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { dateBlock, formatDay, formatTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mon dossier" };

export default function DossierPage({ params, searchParams }: PageProps<"/mon-dossier/[id]">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
      <BackLink href="/mon-dossier">Mes dossiers</BackLink>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
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
  const d = await getDossier(id, user.id);
  if (!d) notFound();
  const tel = d.conciliateur.telephone;

  return (
    <>
      {param(sp, "rejoint") && (
        <Alert variant="success" title="Vous avez rejoint votre dossier">
          Vous retrouverez ici les réunions fixées par votre conciliateur.
        </Alert>
      )}
      {param(sp, "demande") && (
        <Alert variant="success" title="Votre demande a été envoyée au conciliateur">
          {d.conciliateur.nom} vous rappellera pour convenir d&apos;une autre date. D&apos;ici là, la réunion reste prévue.
        </Alert>
      )}
      {param(sp, "erreur") === "deja" && (
        <Alert variant="warning" title="Une demande est déjà en cours pour cette réunion">
          Le conciliateur va vous rappeler. En cas d&apos;urgence : {tel}.
        </Alert>
      )}

      {d.statut !== "en_cours" && (
        <Alert variant={d.statut === "accord" ? "success" : "info"} title={d.statut === "accord" ? "Dossier clos : un accord a été trouvé" : "Dossier clos sans accord"}>
          {d.statut === "accord"
            ? "Le conciliateur vous remet le constat d'accord signé. Vous pouvez demander au juge de le valider (homologation)."
            : "Le conciliateur vous remet une attestation. Vous pouvez saisir le tribunal si vous le souhaitez."}
        </Alert>
      )}

      <div>
        <p className="text-base text-muted-foreground">Dossier n° {d.reference}</p>
        <h1 className="mt-1 text-3xl">Conciliation · {DOMAINES[d.objet].label}</h1>
        <p className="mt-2 text-lg">
          Avec{" "}
          <Link href={`/conciliateurs/${d.conciliateur.id}`} className="font-semibold hover:underline">
            {d.conciliateur.nom}
          </Link>{" "}
          ·{" "}
          <a href={`tel:${tel.replaceAll(" ", "")}`} className="whitespace-nowrap hover:underline">
            {tel}
          </a>
        </p>
      </div>

      <div className="flex gap-3 rounded-xl bg-secondary p-4 text-base">
        <Icon name="users" className="mt-1 size-5 shrink-0 text-primary" />
        <p>
          Les réunions de conciliation sont fixées par le conciliateur avec chacun. Pour en changer la date,
          envoyez-lui une demande : il vous rappellera. Une réunion n&apos;est jamais annulée sans son accord.
        </p>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="seances">
        <h2 id="seances" className="text-2xl">Réunions de conciliation</h2>
        <ul className="flex flex-col gap-3">
          {d.seances.map((s) => {
            const { day, month } = dateBlock(s.debut);
            const prevue = s.statut === "prevue";
            return (
              <li key={s.id}>
                <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div
                      className={cn(
                        "flex w-16 shrink-0 flex-col items-center rounded-xl py-2",
                        prevue ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span className="text-2xl leading-none">{day}</span>
                      <span className="text-xs font-semibold uppercase">{month}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold">
                        {formatDay(s.debut, { capital: true })} à {formatTime(s.debut)}
                      </p>
                      <p className="flex items-center gap-1.5 text-base text-muted-foreground">
                        <Icon name={MODE_ICONS[s.mode]} />
                        {s.mode === "sur_place" ? `${d.conciliateur.lieu}, ${d.conciliateur.adresse}` : MODES[s.mode].label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {!prevue && <Badge variant="secondary">Passée</Badge>}
                        {s.changementDemandeLe && <Badge variant="warning">Changement demandé</Badge>}
                      </div>
                    </div>
                  </div>
                  {prevue && !s.changementDemandeLe && d.statut === "en_cours" && (
                    <Link
                      href={`/mon-dossier/${d.id}/changement?seance=${s.id}`}
                      className={buttonClasses({ variant: "outline", size: "lg" })}
                    >
                      Demander un changement
                    </Link>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
