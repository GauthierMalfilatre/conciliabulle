import Link from "next/link";
import { Suspense } from "react";
import { markRappelAction } from "@/app/actions/pro";
import { Container } from "@/components/layout";
import { ProBand } from "@/components/pro";
import { Alert, Badge, Button, buttonClasses, Card, Icon } from "@/components/ui";
import { listDemandes } from "@/lib/api/pro";
import { DOMAINES, MOMENTS } from "@/lib/api/referentiel";
import { requirePro } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Demandes" };

export default function DemandesPage({ searchParams }: PageProps<"/pro/demandes">) {
  return (
    <>
      <ProBand title="Demandes" subtitle="À traiter" />
      <Container className="flex max-w-4xl flex-col gap-8 py-8">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <Demandes searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function Demandes({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { conciliateurId } = await requirePro();
  const { rappels, changements } = await listDemandes(conciliateurId);
  const enAttente = rappels.filter((r) => !r.traiteeLe).length;

  return (
    <>
      {param(sp, "traite") && <Alert variant="success" title="Demande marquée comme traitée" />}

      <section className="flex flex-col gap-3" aria-labelledby="rappels">
        <h2 id="rappels" className="text-2xl">
          Personnes à rappeler {enAttente > 0 && <Badge variant="warning" className="ml-2 align-middle">{enAttente}</Badge>}
        </h2>
        {rappels.length === 0 ? (
          <Card className="p-6 text-base text-muted-foreground">Aucune demande de rappel.</Card>
        ) : (
          rappels.map((r) => (
            <Card key={r.id} className={r.traiteeLe ? "flex flex-col gap-3 p-5 opacity-75 sm:flex-row sm:items-center" : "flex flex-col gap-3 p-5 sm:flex-row sm:items-center"}>
              <div className="flex-1">
                <p className="text-lg font-semibold">{r.nom}</p>
                <a href={`tel:${r.telephone.replaceAll(" ", "")}`} className="text-xl font-bold text-primary hover:underline">
                  {r.telephone}
                </a>
                <p className="text-base text-muted-foreground">
                  {MOMENTS[r.moment]}
                  {r.motif && <> · {DOMAINES[r.motif].label}</>} · reçue le {formatDateTime(r.createdAt)}
                </p>
              </div>
              {r.traiteeLe ? (
                <Badge variant="success">Traitée</Badge>
              ) : (
                <form action={markRappelAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="outline">
                    <Icon name="check" /> J&apos;ai rappelé
                  </Button>
                </form>
              )}
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="changements">
        <h2 id="changements" className="text-2xl">
          Demandes de changement de réunion {changements.length > 0 && <Badge variant="warning" className="ml-2 align-middle">{changements.length}</Badge>}
        </h2>
        {changements.length === 0 ? (
          <Card className="p-6 text-base text-muted-foreground">Aucune demande en attente.</Card>
        ) : (
          changements.map((c) => (
            <Card key={`${c.dossierId}-${c.seance.id}`} className="flex flex-col gap-3 p-5">
              <p className="text-base text-muted-foreground">Dossier n° {c.reference} · reçue le {formatDateTime(c.le)}</p>
              <p className="text-lg">
                <strong>{c.partie}</strong> souhaite déplacer la réunion du <strong>{formatDateTime(c.seance.debut)}</strong>.
              </p>
              {c.message && <blockquote className="border-l-4 border-border pl-4 text-base italic">« {c.message} »</blockquote>}
              <Link href={`/pro/dossiers/${c.dossierId}#seance-${c.seance.id}`} className={buttonClasses({ className: "self-start" })}>
                Fixer une nouvelle date
              </Link>
            </Card>
          ))
        )}
      </section>
    </>
  );
}
