import Link from "next/link";
import { Suspense } from "react";
import { renewCalendarLinkAction, saveProfilAction } from "@/app/actions/pro";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Input, Select, Textarea } from "@/components/ui";
import { getCalendarLink, getProfil } from "@/lib/api/pro";
import { DEPARTEMENTS } from "@/lib/api/referentiel";
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

async function Profil({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  await requirePro();
  const [c, agenda] = await Promise.all([getProfil(), getCalendarLink()]);

  return (
    <>
      {param(sp, "enregistre") && <Alert variant="success" title="Profil enregistré">Votre fiche publique est à jour.</Alert>}
      {param(sp, "agenda") && <Alert variant="success" title="Nouveau lien d'agenda créé">L&apos;ancien lien ne fonctionne plus.</Alert>}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}
      {!c.verifie && (
        <Alert variant="warning" title="Votre fiche n'est pas encore visible">
          L&apos;association doit d&apos;abord valider votre compte. Vous pouvez préparer votre profil en attendant.
        </Alert>
      )}

      <form action={saveProfilAction} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5 p-6">
          <h2 className="text-2xl">Où recevez-vous ?</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="ville" label="Ville">
              <Input id="ville" name="ville" defaultValue={c.ville} required />
            </Field>
            <Field id="departement" label="Département" hint="Les justiciables cherchent par département.">
              <Select id="departement" name="departement" defaultValue={c.departement}>
                {DEPARTEMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} – {d.nom}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-base text-muted-foreground">
            L&apos;adresse de chaque rendez-vous se règle dans l&apos;onglet{" "}
            <Link href="/pro/parametres" className="font-semibold text-primary hover:underline">
              Horaires
            </Link>
            .
          </p>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <h2 className="text-2xl">Présentation et consignes</h2>
          <Field id="presentation" label="Quelques mots pour vous présenter">
            <Textarea id="presentation" name="presentation" defaultValue={c.presentation} className="min-h-36" />
          </Field>
          <Field
            id="instructions"
            label="Consignes données après la réservation"
            hint="Laissé vide, le message par défaut s'affiche : venir avec tout document utile au dossier."
          >
            <Textarea id="instructions" name="instructions" defaultValue={c.instructions} placeholder="Ex. : Apportez votre pièce d'identité et les courriers échangés." />
          </Field>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" className="h-14 px-8 text-lg">
            <Icon name="check" className="size-5" /> Enregistrer mon profil
          </Button>
          {c.verifie && (
            <Link href={`/conciliateurs/${c.id}`} className="text-base font-semibold text-primary hover:underline">
              Voir ma fiche publique
            </Link>
          )}
        </div>
      </form>

      <Card id="agenda" className="flex scroll-mt-24 flex-col gap-4 p-6">
        <h2 className="text-2xl">Mes rendez-vous dans mon agenda</h2>
        <p className="text-base text-muted-foreground">
          Copiez ce lien dans Google Agenda, Outlook ou le calendrier de votre téléphone (« S&apos;abonner à un
          agenda »). Vos rendez-vous s&apos;y ajoutent tout seuls. Gardez ce lien pour vous.
        </p>
        <Field id="lien-agenda" label="Lien d'abonnement">
          <Input id="lien-agenda" readOnly value={agenda} className="font-mono text-sm" />
        </Field>
        <form action={renewCalendarLinkAction}>
          <Button type="submit" variant="ghost">
            Créer un nouveau lien (si quelqu&apos;un d&apos;autre a eu celui-ci)
          </Button>
        </form>
      </Card>
    </>
  );
}
