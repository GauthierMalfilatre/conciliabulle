import { Suspense } from "react";
import { Container } from "@/components/layout";
import { redirect } from "next/navigation";
import { JusticiableView } from "@/components/dashboard";
import { listMyAppointments } from "@/lib/api/appointments";
import { listMyDossiers } from "@/lib/api/dossiers";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Mon espace" };

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();

  switch (user.status) {
    case "justiciable": {
      const [[prochainRdv], dossiers] = await Promise.all([
        listMyAppointments(user.id, "upcoming"),
        listMyDossiers(user.id),
      ]);
      return <JusticiableView user={user} prochainRdv={prochainRdv} aUnDossier={dossiers.length > 0} />;
    }
    case "conciliateur":
      redirect("/pro");
  }
}

function DashboardSkeleton() {
  return (
    <Container className="flex animate-pulse flex-col gap-8 py-10" aria-busy>
      <span className="sr-only">Chargement…</span>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-9 w-72 rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-muted" />
    </Container>
  );
}
