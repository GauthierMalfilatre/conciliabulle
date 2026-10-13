import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelAppointment } from "@/app/actions/appointments";
import { BackLink, Container } from "@/components/layout";
import { Button, buttonClasses, Card, Field, Icon, Textarea } from "@/components/ui";
import { getAppointment, isModifiable } from "@/lib/api/appointments";
import { requireClient } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Annuler le rendez-vous" };

export default function AnnulerPage({ params }: PageProps<"/mes-rendez-vous/[id]/annuler">) {
  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-12">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" aria-busy>
          <span className="sr-only">Chargement…</span>
        </div>}>
        <Annuler params={params} />
      </Suspense>
    </Container>
  );
}

async function Annuler({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireClient();
  const a = await getAppointment(id, user.id);
  if (!a) notFound();
  if (!isModifiable(a)) redirect(`/mes-rendez-vous/${id}?erreur=delai`);

  return (
    <>
      <BackLink href={`/mes-rendez-vous/${id}`}>Retour au rendez-vous</BackLink>
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600">
          <Icon name="alert" className="size-7" />
        </span>
        <div>
          <h1 className="text-3xl">Annuler ce rendez-vous ?</h1>
          <p className="mt-3 text-lg">
            {formatDateTime(a.debut, { capital: true })}
            <br />
            avec {a.conciliateur.nom}
          </p>
        </div>
        <form action={cancelAppointment} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={a.id} />
          <Field id="motif-annulation" label="Pouvez-vous nous dire pourquoi ? (facultatif)">
            <Textarea id="motif-annulation" name="motif-annulation" className="text-base" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/mes-rendez-vous/${a.id}`} className={buttonClasses({ variant: "outline", size: "lg" })}>
              Non, je garde mon rendez-vous
            </Link>
            <Button type="submit" variant="destructive" size="lg">
              Oui, annuler
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
