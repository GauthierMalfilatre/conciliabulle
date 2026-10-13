import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout";
import { buttonClasses, Card, Icon } from "@/components/ui";
import { getPlatformSettings } from "@/lib/api/reglages";
import { MOMENTS, type Moment } from "@/lib/api/referentiel";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Demande envoyée" };

export default function MerciPage({ searchParams }: PageProps<"/etre-rappele/merci">) {
  return (
    <Container className="flex max-w-xl flex-col py-14 sm:py-20">
      <Card className="flex flex-col items-center gap-5 p-8 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Icon name="check" className="size-8" />
        </span>
        <h1 className="text-3xl">Votre demande est envoyée</h1>
        <Suspense>
          <When searchParams={searchParams} />
        </Suspense>
        <p className="text-base text-muted-foreground">
          L&apos;appel peut venir d&apos;un numéro masqué. Pensez à décrocher !
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClasses({ size: "lg" })}>
            Retour à l&apos;accueil
          </Link>
          <Link href="/conciliateurs" className={buttonClasses({ variant: "outline", size: "lg" })}>
            Voir les conciliateurs
          </Link>
        </div>
      </Card>
    </Container>
  );
}

async function When({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [sp, settings] = await Promise.all([searchParams, getPlatformSettings()]);
  const moment = param(sp, "moment");
  const jours = settings.delaiRappelJours;
  const label = moment && moment in MOMENTS && moment !== "indifferent" ? MOMENTS[moment as Moment] : null;
  return (
    <p className="text-lg">
      Un conseiller vous appellera sous {jours} jour{jours > 1 ? "s" : ""} ouvré{jours > 1 ? "s" : ""}
      {label && <>, de préférence <strong>{label.toLowerCase()}</strong></>}.
    </p>
  );
}
