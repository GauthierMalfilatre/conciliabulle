import { Suspense } from "react";
import { BackLink, Container, PageHeading } from "@/components/layout";
import { Card } from "@/components/ui";
import { getPlatformSettings } from "@/lib/api/reglages";
import { getConciliateur } from "@/lib/api/conciliateurs";
import { getCurrentUser } from "@/lib/auth/session";
import { param, type SearchParams } from "@/lib/search-params";
import { CallbackForm } from "./callback-form";

export const metadata = { title: "Être rappelé" };

export default function EtreRappelePage({ searchParams }: PageProps<"/etre-rappele">) {
  return (
    <Container className="flex max-w-2xl flex-col gap-8 py-10 sm:py-14">
      <PageHeading
        eyebrow="Sans prendre rendez-vous"
        title="Être rappelé par un conseiller"
        description="Laissez votre numéro : un conseiller vous appelle pour comprendre votre situation et vous orienter. C'est gratuit."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Form({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const conciliateurId = param(sp, "conciliateur");
  const [user, conciliateur, settings] = await Promise.all([
    getCurrentUser(),
    conciliateurId ? getConciliateur(conciliateurId) : null,
    getPlatformSettings(),
  ]);
  const jours = settings.delaiRappelJours;

  return (
    <>
      {conciliateur && <BackLink href={`/conciliateurs/${conciliateur.id}`}>Retour à {conciliateur.nom}</BackLink>}
      <Card className="p-6 sm:p-8">
        <p className="mb-6 text-lg">
          Un conseiller vous rappelle <strong>sous {jours} jour{jours > 1 ? "s" : ""} ouvré{jours > 1 ? "s" : ""}</strong>.
        </p>
        {conciliateur && (
          <p className="mb-6 rounded-xl bg-secondary p-4 text-base">
            Votre demande sera transmise à <strong>{conciliateur.nom}</strong> ({conciliateur.ville}).
          </p>
        )}
        <CallbackForm
          conciliateurId={conciliateur?.id}
          defaults={{ nom: user?.name ?? "", telephone: "" }}
        />
      </Card>
    </>
  );
}
