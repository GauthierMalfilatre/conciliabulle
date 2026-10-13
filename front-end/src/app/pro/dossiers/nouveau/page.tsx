import { notFound } from "next/navigation";
import { Suspense } from "react";
import { openDossierAction } from "@/app/actions/pro";
import { BackLink, Container } from "@/components/layout";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { getProAppointment } from "@/lib/api/pro";
import { DOMAINES, motifLabel } from "@/lib/api/referentiel";
import { requirePro } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Ouvrir un dossier" };

export default function NouveauDossierPage({ searchParams }: PageProps<"/pro/dossiers/nouveau">) {
  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-10">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <Nouveau searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Nouveau({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { conciliateurId } = await requirePro();
  const rdvId = param(sp, "rdv");
  const a = rdvId ? await getProAppointment(conciliateurId, rdvId) : null;
  if (!a) notFound();

  return (
    <>
      <BackLink href={`/pro/rendez-vous/${a.id}`}>Retour au rendez-vous</BackLink>
      <h1 className="text-3xl">Ouvrir un dossier de conciliation</h1>
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}
      <Card className="p-6 sm:p-8">
        <p className="text-base text-muted-foreground">À partir du rendez-vous du {formatDateTime(a.debut)}</p>
        <p className="mt-1 text-lg">
          <strong>{a.client.nom}</strong> · {motifLabel(a.motif)}
        </p>
        <form action={openDossierAction} className="mt-6 flex flex-col gap-5">
          <input type="hidden" name="rdv" value={a.id} />
          <Field id="objet" label="Objet du litige">
            <Select id="objet" name="objet" defaultValue={a.motif === "autre" ? "voisinage" : a.motif}>
              {Object.entries(DOMAINES).map(([code, d]) => (
                <option key={code} value={code}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="autre" label="Nom de l'autre partie">
            <Input id="autre" name="autre" placeholder="Ex. : M. Bernard Roche, ou la société concernée" required />
          </Field>
          <p className="rounded-lg bg-secondary p-4 text-base">
            Deux codes personnels seront créés : un pour {a.client.nom} (déjà rattaché au dossier), un pour
            l&apos;autre partie, à lui transmettre avec sa convocation.
          </p>
          <Button type="submit" size="lg" className="self-start">
            Ouvrir le dossier
          </Button>
        </form>
      </Card>
    </>
  );
}
