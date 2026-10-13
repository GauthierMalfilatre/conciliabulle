import Link from "next/link";
import { Suspense } from "react";
import { Container, PageHeading } from "@/components/layout";
import { buttonClasses, Card, Icon } from "@/components/ui";
import { listMyDossiers } from "@/lib/api/dossiers";
import { DOMAINES } from "@/lib/api/referentiel";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Mon dossier" };

export default function MonDossierPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-8 py-10 sm:py-14">
      <PageHeading
        eyebrow="Mon espace"
        title="Mon dossier de conciliation"
        description="Retrouvez les réunions fixées par votre conciliateur."
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const user = await requireClient();
  const dossiers = await listMyDossiers(user.id);

  if (dossiers.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
          <Icon name="file" className="size-7" />
        </span>
        <p className="text-lg">Vous n&apos;avez pas encore rejoint de dossier.</p>
        <p className="max-w-md text-base text-muted-foreground">
          Après votre premier rendez-vous, le conciliateur vous remet un <strong>code dossier</strong>{" "}
          personnel. Il vous permet de suivre les réunions ici.
        </p>
        <Link href="/mon-dossier/rejoindre" className={buttonClasses({ size: "lg" })}>
          J&apos;ai un code dossier
        </Link>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {dossiers.map((d) => {
        const next = d.seances.find((s) => s.statut === "prevue");
        return (
          <li key={d.id}>
            <Link href={`/mon-dossier/${d.id}`} className="group block rounded-xl">
              <Card className="flex items-center gap-4 p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                  <Icon name="file" className="size-6" />
                </span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Dossier n° {d.reference}</p>
                  <p className="text-lg font-semibold">{DOMAINES[d.objet].label} · {d.conciliateur.nom}</p>
                  {next && (
                    <p className="text-base">Prochaine réunion : {formatDateTime(next.debut)}</p>
                  )}
                </div>
                <Icon name="chevronRight" className="size-6 text-muted-foreground group-hover:text-primary" />
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
