import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout";
import { DossierStatusBadge, ProBand } from "@/components/pro";
import { Badge, Card, Icon } from "@/components/ui";
import { listProDossiers } from "@/lib/api/pro";
import { DOMAINES } from "@/lib/api/referentiel";
import { requirePro } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Dossiers" };

export default function DossiersPage() {
  return (
    <>
      <ProBand title="Dossiers de conciliation" />
      <Container className="flex max-w-4xl flex-col gap-4 py-8">
        <p className="text-base text-muted-foreground">
          Pour ouvrir un dossier, partez d&apos;un rendez-vous de votre agenda : « Ouvrir un dossier ».
        </p>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <List />
        </Suspense>
      </Container>
    </>
  );
}

async function List() {
  const { conciliateurId } = await requirePro();
  const dossiers = await listProDossiers(conciliateurId);
  if (dossiers.length === 0) return <Card className="p-6 text-base text-muted-foreground">Aucun dossier pour l&apos;instant.</Card>;

  return (
    <ul className="flex flex-col gap-3">
      {dossiers.map((d) => {
        const next = d.seances.find((s) => s.statut === "prevue");
        const pending = d.seances.filter((s) => s.demande && !s.demande.traiteeLe).length;
        return (
          <li key={d.id}>
            <Link href={`/pro/dossiers/${d.id}`} className="group block rounded-lg">
              <Card className="flex items-center gap-4 p-5 transition-shadow group-hover:shadow-md">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <Icon name="file" className="size-6" />
                </span>
                <div className="flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
                    Dossier n° {d.reference} <DossierStatusBadge statut={d.statut} />
                    {pending > 0 && <Badge variant="warning">Changement demandé</Badge>}
                  </p>
                  <p className="text-lg font-semibold">
                    {d.parties.map((p) => p.nom).join(" / ")} · {DOMAINES[d.objet].label}
                  </p>
                  {next && <p className="text-base">Prochaine réunion : {formatDateTime(next.debut)}</p>}
                </div>
                <Icon name="chevronRight" className="size-6 text-primary" />
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
