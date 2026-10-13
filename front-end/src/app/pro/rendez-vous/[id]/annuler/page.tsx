import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelByConciliateurAction } from "@/app/actions/pro";
import { BackLink, Container } from "@/components/layout";
import { Button, buttonClasses, Card, Field, Icon, Textarea } from "@/components/ui";
import { getProAppointment } from "@/lib/api/pro";
import { requirePro } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Annuler un rendez-vous" };

export default function ProAnnulerPage({ params }: PageProps<"/pro/rendez-vous/[id]/annuler">) {
  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-8 sm:py-10">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" aria-busy><span className="sr-only">Chargement…</span></div>}>
        <Annuler params={params} />
      </Suspense>
    </Container>
  );
}

async function Annuler({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { conciliateurId } = await requirePro();
  const a = await getProAppointment(conciliateurId, id);
  if (!a) notFound();
  if (a.statut !== "a_venir") redirect(`/pro/rendez-vous/${id}`);

  return (
    <>
      <BackLink href={`/pro/rendez-vous/${id}`}>Retour au rendez-vous</BackLink>
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <span className="grid size-14 place-items-center rounded-full bg-rose-100 text-rose-700">
          <Icon name="alert" className="size-7" />
        </span>
        <div>
          <h1 className="text-3xl">Annuler ce rendez-vous ?</h1>
          <p className="mt-3 text-lg">
            {a.client.nom}, {formatDateTime(a.debut)}
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            Le justiciable est prévenu par SMS, avec votre message. Il pourra reprendre un autre créneau.
          </p>
        </div>
        <form action={cancelByConciliateurAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={a.id} />
          <Field id="message" label="Message pour le justiciable (facultatif)">
            <Textarea id="message" name="message" placeholder="Ex. : je suis absent ce jour-là, merci de choisir un autre horaire." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/pro/rendez-vous/${a.id}`} className={buttonClasses({ variant: "outline", size: "lg" })}>
              Non, le garder
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
