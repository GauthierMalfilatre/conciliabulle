import { Suspense } from "react";
import { BackLink, Container } from "@/components/layout";
import { Card, Icon } from "@/components/ui";
import { DEMO_DOSSIER_CODE } from "@/lib/api/dossiers";
import { requireClient } from "@/lib/auth/session";
import { JoinForm } from "./join-form";

export const metadata = { title: "Rejoindre mon dossier" };

export default function RejoindrePage() {
  return (
    <Container className="flex max-w-xl flex-col gap-6 py-8 sm:py-12">
      <BackLink href="/mon-dossier">Mon dossier</BackLink>
      <h1 className="text-3xl">Rejoindre mon dossier</h1>
      <Card className="p-6 sm:p-8">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <ClientOnly>
            <JoinForm demoCode={DEMO_DOSSIER_CODE} />
          </ClientOnly>
        </Suspense>
      </Card>
      <div className="flex gap-3 rounded-xl bg-secondary p-4 text-base">
        <Icon name="shield" className="mt-1 size-5 shrink-0 text-primary" />
        <p>
          Ce code est <strong>personnel</strong> : ne le communiquez à personne, pas même à l&apos;autre
          personne concernée par la conciliation. Elle a reçu son propre code.
        </p>
      </div>
    </Container>
  );
}

/** Clients only: professionals are sent back to their home page. */
async function ClientOnly({ children }: { children: React.ReactNode }) {
  await requireClient();
  return children;
}
