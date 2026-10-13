import Link from "next/link";
import { Suspense } from "react";
import { addAbsenceAction, removeAbsenceAction } from "@/app/actions/pro";
import { Container } from "@/components/layout";
import { ProBand, SettingsTabs } from "@/components/pro";
import { Alert, Button, Card, Field, Icon, Input } from "@/components/ui";
import { conflicts, getParametres } from "@/lib/api/pro";
import { requirePro } from "@/lib/auth/session";
import { formatShortDate, formatTime } from "@/lib/format";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mes absences" };

export default function AbsencesPage({ searchParams }: PageProps<"/pro/parametres/absences">) {
  return (
    <>
      <ProBand title="Paramètres">
        <SettingsTabs current="/pro/parametres/absences" />
      </ProBand>
      <Container className="flex max-w-3xl flex-col gap-6 py-8">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
          <Absences searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

const longDate = (ymd: string) => formatShortDate(`${ymd}T12:00:00`);

async function Absences({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { conciliateurId } = await requirePro();
  const p = await getParametres(conciliateurId);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = p.absences.filter((a) => a.au >= today);

  return (
    <>
      {param(sp, "ajoute") && <Alert variant="success" title="Absence ajoutée">Ces jours ne sont plus proposés en ligne.</Alert>}
      {param(sp, "supprime") && <Alert variant="info" title="Absence supprimée" />}
      {param(sp, "erreur") && <Alert variant="destructive" title={param(sp, "erreur")!} />}

      <Card className="p-6">
        <h2 className="text-2xl">Ajouter une absence</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Congés, formation, maladie : aucun créneau ne sera proposé ces jours-là.
        </p>
        <form action={addAbsenceAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field id="du" label="Du">
            <Input id="du" name="du" type="date" min={today} required />
          </Field>
          <Field id="au" label="Au (inclus)">
            <Input id="au" name="au" type="date" min={today} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="motif" label="Motif (visible par vous seul)">
              <Input id="motif" name="motif" list="motifs" placeholder="Ex. : Congés" />
            </Field>
            <datalist id="motifs">
              <option value="Congés" />
              <option value="Formation" />
              <option value="Maladie" />
            </datalist>
          </div>
          <Button type="submit" size="lg" className="sm:col-span-2 sm:justify-self-start">
            <Icon name="plus" className="size-5" /> Ajouter
          </Button>
        </form>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="absences">
        <h2 id="absences" className="text-2xl">Absences prévues</h2>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-base text-muted-foreground">Aucune absence prévue.</Card>
        ) : (
          upcoming.map((a) => {
            const clash = conflicts(conciliateurId, a).filter((r) => r.statut === "a_venir");
            return (
              <Card key={a.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Icon name="calendar" className="size-6 text-primary" />
                  <p className="flex-1 text-lg">
                    <strong>{a.du === a.au ? `Le ${longDate(a.du)}` : `Du ${longDate(a.du)} au ${longDate(a.au)}`}</strong>
                    <span className="text-muted-foreground"> · {a.motif}</span>
                  </p>
                  <form action={removeAbsenceAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={`Supprimer l'absence : ${a.motif}`}>
                      <Icon name="trash" /> Supprimer
                    </Button>
                  </form>
                </div>
                {clash.length > 0 && (
                  <Alert variant="warning" title={`${clash.length} rendez-vous déjà pris pendant cette absence`}>
                    <p className="mt-1">Annulez-les ou prévenez les personnes :</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {clash.map((r) => (
                        <li key={r.id}>
                          <Link href={`/pro/rendez-vous/${r.id}`} className="font-semibold underline">
                            {r.client.nom}, {formatShortDate(r.debut)} à {formatTime(r.debut)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Card>
            );
          })
        )}
      </section>
    </>
  );
}
