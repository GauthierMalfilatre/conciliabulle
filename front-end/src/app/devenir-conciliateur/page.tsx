import { Suspense } from "react";
import { Container, PageHeading } from "@/components/layout";
import { Alert, Card, Icon, type IconName } from "@/components/ui";
import { param, type SearchParams } from "@/lib/search-params";
import { CandidatureForm } from "./candidature-form";

export const metadata = { title: "Devenir conciliateur de justice" };

// Plain-language summary of the recruitment rules (décret n° 78-381 du 20 mars 1978).
const CONDITIONS = [
  "Être majeur et jouir de ses droits civiques et politiques",
  "Justifier d'au moins trois ans d'expérience en matière juridique",
  "Ne pas exercer d'activité judiciaire ni de mandat électif dans le ressort où l'on intervient",
];

const ETAPES: { icon: IconName; title: string; text: string }[] = [
  { icon: "file", title: "Vous déposez votre demande", text: "Avec le formulaire ci-dessous : l'association de votre département la reçoit." },
  { icon: "phone", title: "L'association vous contacte", text: "Elle vous explique la mission et vous accompagne dans votre candidature au tribunal." },
  { icon: "briefcase", title: "Vous êtes nommé", text: "Par le premier président de la cour d'appel, d'abord pour un an, puis pour trois ans renouvelables." },
];

export default function DevenirConciliateurPage({ searchParams }: PageProps<"/devenir-conciliateur">) {
  return (
    <Container className="flex max-w-4xl flex-col gap-8 py-8 sm:py-12">
      <PageHeading
        eyebrow="Rejoindre l'association"
        title="Devenir conciliateur de justice"
        description="Un engagement bénévole, au service des habitants de votre territoire : aider des personnes en désaccord à trouver une solution amiable, sans procès."
      />

      <Suspense>
        <Envoye searchParams={searchParams} />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-2xl">La mission</h2>
          <ul className="mt-4 flex flex-col gap-3 text-base">
            <li>Recevoir les personnes lors de permanences, en mairie ou en maison de justice.</li>
            <li>Écouter chacun, puis proposer une solution acceptable par tous.</li>
            <li>Rédiger le constat d&apos;accord, qu&apos;un juge peut rendre exécutoire.</li>
            <li>Bénévole, avec une indemnité forfaitaire pour les frais.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-2xl">Les conditions</h2>
          <ul className="mt-4 flex flex-col gap-3 text-base">
            {CONDITIONS.map((c) => (
              <li key={c} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Icon name="check" />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="etapes" className="flex flex-col gap-4">
        <h2 id="etapes" className="text-2xl">Comment ça se passe ?</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <li key={e.title}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
                  <Icon name={e.icon} className="size-5" />
                </span>
                <p className="text-lg font-semibold">
                  {i + 1}. {e.title}
                </p>
                <p className="text-base text-muted-foreground">{e.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <Card id="formulaire" className="scroll-mt-24 p-6 sm:p-8">
        <h2 className="text-2xl">Être recontacté par l&apos;association</h2>
        <p className="mt-1 mb-6 text-base text-muted-foreground">
          Sans engagement : c&apos;est une prise de contact.
        </p>
        <CandidatureForm />
      </Card>
    </Container>
  );
}

async function Envoye({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  if (!param(sp, "envoye")) return null;
  return (
    <Alert variant="success" title="Merci, votre demande est envoyée">
      L&apos;association des conciliateurs de votre département va vous contacter.
    </Alert>
  );
}
