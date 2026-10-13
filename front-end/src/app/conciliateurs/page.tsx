import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout";
import { ConciliateurCard, SearchForm, type SearchValues } from "@/components/conciliateurs";
import { Alert, buttonClasses, Card, Icon } from "@/components/ui";
import { searchConciliateurs } from "@/lib/api/conciliateurs";
import { regionByCode } from "@/lib/api/referentiel";
import { param, withParams, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Trouver un conciliateur" };

const PAGE_SIZE = 6;

export default function ConciliateursPage({ searchParams }: PageProps<"/conciliateurs">) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const values: SearchValues = {
    q: param(sp, "q"),
    region: param(sp, "region"),
    domaine: param(sp, "domaine"),
    mode: param(sp, "mode"),
    dispo: param(sp, "dispo"),
  };
  const pages = Math.max(1, Number(param(sp, "pages")) || 1);
  const { items, total } = await searchConciliateurs({ ...values, dispo: values.dispo === "1", limit: pages * PAGE_SIZE });
  const region = values.region ? regionByCode(values.region) : undefined;

  return (
    <>
      <section className="bg-primary pt-8 pb-6 text-white">
        <Container className="flex flex-col gap-5">
          <h1 className="text-3xl sm:text-4xl">Trouvez un conciliateur près de chez vous</h1>
          <SearchForm values={values} />
        </Container>
      </section>

      <Container className="flex flex-col gap-5 py-8">
        <p className="text-lg" aria-live="polite">
          <strong>{total}</strong> conciliateur{total > 1 ? "s" : ""}
          {region ? <> en {region.nom}</> : <> en France</>}
        </p>

        {items.length === 0 ? (
          <Alert title="Aucun conciliateur ne correspond à votre recherche">
            <p className="mt-1">
              Essayez une autre orthographe, ou{" "}
              <Link href={withParams("/conciliateurs", { q: values.q })} className="font-semibold underline">
                cherchez dans toute la France
              </Link>
              .
            </p>
            <p className="mt-2">
              Vous pouvez aussi{" "}
              <Link href="/etre-rappele" className="font-semibold underline">
                demander à être rappelé
              </Link>{" "}
              : un conseiller vous aidera à trouver le bon conciliateur.
            </p>
          </Alert>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((m) => (
              <li key={m.id}>
                <ConciliateurCard conciliateur={m} />
              </li>
            ))}
          </ul>
        )}

        {items.length < total && (
          <Link
            href={withParams("/conciliateurs", { ...values, pages: pages + 1 })}
            scroll={false}
            className={buttonClasses({ variant: "outline", size: "lg", className: "self-center" })}
          >
            Voir plus de conciliateurs
          </Link>
        )}

        <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            <Icon name="phone" className="size-6" />
          </span>
          <p className="flex-1 text-base">
            <strong>Vous ne savez pas qui choisir ?</strong> Un conseiller peut vous rappeler pour vous
            orienter, gratuitement.
          </p>
          <Link href="/etre-rappele" className={buttonClasses({ variant: "outline", size: "lg" })}>
            Être rappelé
          </Link>
        </Card>
      </Container>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <>
      <div className="h-56 bg-primary" />
      <Container className="flex animate-pulse flex-col gap-4 py-8" aria-busy>
        <span className="sr-only">Chargement…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 rounded-lg bg-muted" />
        ))}
      </Container>
    </>
  );
}
