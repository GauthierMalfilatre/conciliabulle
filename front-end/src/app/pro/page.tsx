import Link from "next/link";
import { Suspense } from "react";
import { setPresenceAction, toggleReservationAction } from "@/app/actions/pro";
import { Container } from "@/components/layout";
import { AppointmentRow, bandButton, ProBand, StatTile } from "@/components/pro";
import { Alert, Button, Card, Icon } from "@/components/ui";
import { getDashboard } from "@/lib/api/pro";
import { DOMAINES, MOTIF_AUTRE } from "@/lib/api/referentiel";
import { requirePro } from "@/lib/auth/session";
import { formatDay, formatShortDate, formatTime } from "@/lib/format";

export const metadata = { title: "Tableau de bord" };

export default function ProDashboardPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy>
          <span className="sr-only">Chargement…</span>
          <div className="h-40 bg-primary" />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-base text-muted-foreground">{children}</p>;
}

async function Dashboard() {
  const user = await requirePro();
  const d = await getDashboard(user.conciliateurId);
  const prenom = user.name.split(" ")[0];

  return (
    <>
      <ProBand
        subtitle={formatDay(new Date().toISOString(), { capital: true })}
        title={`Bonjour ${prenom}`}
        actions={
          <>
            <Link href="/pro/agenda" className={bandButton}>
              <Icon name="calendar" className="size-5" /> Mon agenda
            </Link>
            <Link href={`/conciliateurs/${user.conciliateurId}`} className={bandButton}>
              <Icon name="externalLink" className="size-5" /> Ma fiche publique
            </Link>
          </>
        }
      />

      <Container className="flex flex-col gap-6 py-8">
        {!d.reservationOuverte && (
          <Alert variant="warning" title="La prise de rendez-vous en ligne est en pause">
            <p className="mt-1">Les justiciables voient votre fiche, mais ne peuvent pas réserver.</p>
            <form action={toggleReservationAction} className="mt-3">
              <input type="hidden" name="ouverte" value="1" />
              <input type="hidden" name="retour" value="/pro" />
              <Button type="submit" size="sm">
                <Icon name="play" /> Rouvrir les réservations
              </Button>
            </form>
          </Alert>
        )}

        <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile href="/pro/agenda" icon="calendar" label="rendez-vous sur 7 jours" value={d.stats.semaine} />
          <StatTile href="#a-renseigner" icon="clock" label="à renseigner" value={d.stats.aRenseigner} highlight={d.stats.aRenseigner > 0} />
          <StatTile href="/pro/demandes" icon="message" label="demandes à traiter" value={d.stats.rappels + d.stats.changements} highlight={d.stats.rappels + d.stats.changements > 0} />
          <StatTile href="/pro/dossiers" icon="file" label="dossiers en cours" value={d.stats.dossiersEnCours} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden">
              <h2 className="border-b border-border px-5 py-4 text-xl">Aujourd&apos;hui</h2>
              {d.aujourdhui.length === 0 ? (
                <Empty>Aucun rendez-vous aujourd&apos;hui.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {d.aujourdhui.map((a) => (
                    <li key={a.id}>
                      <AppointmentRow a={a} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card id="a-renseigner" className="overflow-hidden scroll-mt-24">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-xl">Rendez-vous à renseigner</h2>
                <p className="text-base text-muted-foreground">Indiquez si la personne est venue : cela alimente vos statistiques.</p>
              </div>
              {d.aRenseigner.length === 0 ? (
                <Empty>Tout est à jour.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {d.aRenseigner.map((a) => (
                    <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                      <Link href={`/pro/rendez-vous/${a.id}`} className="flex-1 hover:underline">
                        <span className="block text-lg font-semibold">{a.client.nom}</span>
                        <span className="block text-base text-muted-foreground">
                          {formatShortDate(a.debut)} à {formatTime(a.debut)} · {a.motif === "autre" ? MOTIF_AUTRE.label : DOMAINES[a.motif].label}
                        </span>
                      </Link>
                      <div className="flex gap-2">
                        {(["honore", "absent"] as const).map((p) => (
                          <form key={p} action={setPresenceAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="presence" value={p} />
                            <input type="hidden" name="retour" value="/pro" />
                            <Button type="submit" size="sm" variant={p === "honore" ? "outline" : "ghost"}>
                              {p === "honore" ? "Venu" : "Absent"}
                            </Button>
                          </form>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <h2 className="border-b border-border px-5 py-4 text-xl">Prochains rendez-vous</h2>
            {d.prochains.length === 0 ? (
              <Empty>Aucun rendez-vous à venir.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {d.prochains.map((a) => (
                  <li key={a.id}>
                    <AppointmentRow a={a} showDate={formatShortDate(a.debut)} />
                  </li>
                ))}
              </ul>
            )}
            <Link href="/pro/agenda" className="block border-t border-border px-5 py-4 text-base font-semibold text-primary hover:underline">
              Voir tout l&apos;agenda
            </Link>
          </Card>
        </div>
      </Container>
    </>
  );
}
