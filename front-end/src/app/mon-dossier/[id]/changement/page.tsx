import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requestChangeAction } from "@/app/actions/dossiers";
import { BackLink, Container } from "@/components/layout";
import { Button, buttonClasses, Card, Field, Icon, Textarea } from "@/components/ui";
import { getDossier } from "@/lib/api/dossiers";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Demander un changement" };

export default function ChangementPage({ params, searchParams }: PageProps<"/mon-dossier/[id]/changement">) {
  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-12">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <Changement params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Changement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireClient();
  const d = await getDossier(id, user.id);
  const s = d?.seances.find((x) => x.id === param(sp, "seance") && x.statut === "prevue");
  if (!d || !s) notFound();

  return (
    <>
      <BackLink href={`/mon-dossier/${id}`}>Retour au dossier</BackLink>
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          <Icon name="calendar" className="size-7" />
        </span>
        <div>
          <h1 className="text-3xl">Demander un changement</h1>
          <p className="mt-3 text-lg">Réunion du {formatDateTime(s.debut)}</p>
          <p className="mt-2 text-base text-muted-foreground">
            Votre demande est envoyée à {d.conciliateur.nom}, qui vous rappellera. La réunion reste prévue
            tant qu&apos;une nouvelle date n&apos;est pas fixée.
          </p>
        </div>
        <form action={requestChangeAction} className="flex flex-col gap-5">
          <input type="hidden" name="dossier" value={d.id} />
          <input type="hidden" name="seance" value={s.id} />
          <Field id="message" label="Pourquoi souhaitez-vous changer ? Quand êtes-vous disponible ? (facultatif)">
            <Textarea id="message" name="message" placeholder="Ex. : je suis hospitalisé ce jour-là, je suis libre les mardis matin." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/mon-dossier/${d.id}`} className={buttonClasses({ variant: "outline", size: "lg" })}>
              Annuler ma demande
            </Link>
            <Button type="submit" size="lg">
              Envoyer la demande
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
