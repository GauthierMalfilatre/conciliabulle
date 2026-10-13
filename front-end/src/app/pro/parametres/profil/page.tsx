import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { saveProfilAction } from "@/app/actions/pro";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Input, Textarea } from "@/components/ui";
import { getProfil } from "@/lib/api/pro";
import { DOMAINES, MODES } from "@/lib/api/referentiel";
import { requirePro } from "@/lib/auth/session";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mon profil public" };

export default function ProfilPage({ searchParams }: PageProps<"/pro/parametres/profil">) {
  return (
    <>
      <ProBand title="Paramètres">
        <SettingsTabs current="/pro/parametres/profil" />
      </ProBand>
      <Container className="flex max-w-3xl flex-col gap-6 py-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <Profil searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

const check = "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 text-base has-checked:border-primary has-checked:bg-secondary";

async function Profil({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { conciliateurId } = await requirePro();
  const c = await getProfil(conciliateurId);
  if (!c) notFound();

  return (
    <>
      {param(sp, "enregistre") && <Alert variant="success" title="Profil enregistré">Votre fiche publique est à jour.</Alert>}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <form action={saveProfilAction} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5 p-6">
          <h2 className="text-2xl">Où recevez-vous ?</h2>
          <Field id="lieu" label="Lieu de permanence">
            <Input id="lieu" name="lieu" defaultValue={c.lieu} placeholder="Ex. : Mairie du 11e arrondissement" required />
          </Field>
          <Field id="adresse" label="Adresse">
            <Input id="adresse" name="adresse" defaultValue={c.adresse} required />
          </Field>
          <Field id="telephone" label="Téléphone affiché aux justiciables">
            <Input id="telephone" name="telephone" type="tel" defaultValue={c.telephone} required />
          </Field>
          <label className={check}>
            <input type="checkbox" name="accesPMR" defaultChecked={c.accesPMR} className="size-5 accent-[#0f6cbd]" />
            Lieu accessible en fauteuil roulant
          </label>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <h2 className="text-2xl">Présentation</h2>
          <Field id="presentation" label="Quelques mots pour vous présenter">
            <Textarea id="presentation" name="presentation" defaultValue={c.presentation} className="min-h-36" />
          </Field>
          <Field id="langues" label="Autres langues parlées (séparées par des virgules)">
            <Input id="langues" name="langues" defaultValue={c.langues.filter((l) => l !== "Français").join(", ")} placeholder="Ex. : Anglais, Arabe" />
          </Field>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-2xl font-bold">Litiges traités</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(DOMAINES).map(([code, d]) => (
                <label key={code} className={check}>
                  <input type="checkbox" name="domaines" value={code} defaultChecked={c.domaines.includes(code as never)} className="size-5 accent-[#0f6cbd]" />
                  {d.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-2xl font-bold">Types de rendez-vous proposés</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(MODES).map(([code, m]) => (
                <label key={code} className={check}>
                  <input type="checkbox" name="modes" value={code} defaultChecked={c.modes.includes(code as never)} className="size-5 accent-[#0f6cbd]" />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" className="h-14 px-8 text-lg">
            <Icon name="check" className="size-5" /> Enregistrer mon profil
          </Button>
          <Link href={`/conciliateurs/${conciliateurId}`} className="text-base font-semibold text-primary hover:underline">
            Voir ma fiche publique
          </Link>
        </div>
      </form>
    </>
  );
}
