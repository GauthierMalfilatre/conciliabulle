import Link from "next/link";
import { Suspense } from "react";
import { AppointmentCard } from "@/components/appointments";
import { Container, PageHeading } from "@/components/layout";
import { buttonClasses, Card, Icon } from "@/components/ui";
import { listMyAppointments } from "@/lib/api/appointments";
import { requireClient } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata = { title: "Mes rendez-vous" };

export default function MesRendezVousPage({ searchParams }: PageProps<"/mes-rendez-vous">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-8 py-10 sm:py-14">
      <PageHeading
        eyebrow="Mon espace"
        title="Mes rendez-vous"
        actions={
          <Link href="/conciliateurs" className={buttonClasses({ size: "lg" })}>
            <Icon name="plus" className="size-5" />
            Prendre rendez-vous
          </Link>
        }
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" aria-busy>
          <span className="sr-only">Chargement…</span>
        </div>}>
        <List searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function List({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  await requireClient();
  const scope = param(sp, "onglet") === "passes" ? "past" : "upcoming";
  const items = await listMyAppointments(scope);

  const tabs = [
    { scope: "upcoming", href: "/mes-rendez-vous", label: "À venir" },
    { scope: "past", href: "/mes-rendez-vous?onglet=passes", label: "Passés et annulés" },
  ];

  return (
    <>
      <nav className="flex gap-2 rounded-xl bg-muted p-1.5" aria-label="Filtrer les rendez-vous">
        {tabs.map((t) => (
          <Link
            key={t.scope}
            href={t.href}
            aria-current={t.scope === scope ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-4 py-3 text-center text-base font-semibold transition-colors",
              t.scope === scope ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
            <Icon name="calendar" className="size-7" />
          </span>
          <p className="text-lg">
            {scope === "upcoming" ? "Vous n'avez aucun rendez-vous à venir." : "Aucun rendez-vous passé."}
          </p>
          {scope === "upcoming" && (
            <Link href="/conciliateurs" className={buttonClasses({ size: "lg" })}>
              Trouver un conciliateur
            </Link>
          )}
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <AppointmentCard appointment={a} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
