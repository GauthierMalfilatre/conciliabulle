import Link from "next/link";
import { AppointmentCard } from "@/components/appointments";
import { Container } from "@/components/layout";
import { SearchForm } from "@/components/conciliateurs";
import { buttonClasses, Card, Icon, type IconName } from "@/components/ui";
import type { Appointment } from "@/lib/api/types";
import type { User } from "@/lib/auth/types";
import { cn } from "@/lib/cn";

const steps = [
  { title: "Prendre rendez-vous", detail: "En ligne ou en demandant à être rappelé" },
  { title: "Premier rendez-vous", detail: "Vous expliquez la situation au conciliateur, gratuitement" },
  { title: "Réunion de conciliation", detail: "Le conciliateur invite l'autre personne pour chercher un accord" },
  { title: "Constat d'accord", detail: "Signé par tous ; il peut être validé par un juge" },
] as const;

const shortcuts: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: "/mes-rendez-vous", icon: "calendar", title: "Mes rendez-vous", text: "Voir, changer ou annuler" },
  { href: "/mon-dossier", icon: "file", title: "Mon dossier", text: "Réunions de conciliation" },
  { href: "/etre-rappele", icon: "phone", title: "Être rappelé", text: "Un conseiller vous appelle" },
];

export function JusticiableView({
  user,
  prochainRdv,
  aUnDossier = false,
}: {
  user: User;
  prochainRdv?: Appointment;
  aUnDossier?: boolean;
}) {
  const firstName = user.name.split(" ")[0];
  // A joined case means joint sessions; a booked appointment, the information meeting.
  const current = aUnDossier ? 2 : prochainRdv ? 1 : 0;

  return (
    <>
      <section className="bg-primary py-8 text-white sm:py-10">
        <Container className="flex flex-col gap-5">
          <div>
            <p className="text-lg">Bonjour {firstName},</p>
            <h1 className="text-3xl sm:text-4xl">Trouvez un conciliateur et prenez rendez-vous</h1>
          </div>
          <SearchForm values={{}} withFilters={false} />
        </Container>
      </section>

      <Container className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="prochain-rdv">
            <h2 id="prochain-rdv" className="text-2xl">
              Mon prochain rendez-vous
            </h2>
            {prochainRdv ? (
              <AppointmentCard appointment={prochainRdv} />
            ) : (
              <Card className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
                <p className="flex-1 text-base">Vous n&apos;avez pas de rendez-vous prévu.</p>
                <Link href="/conciliateurs" className={buttonClasses({ size: "lg" })}>
                  Prendre rendez-vous
                </Link>
              </Card>
            )}
          </section>

          <Card className="p-6">
            <h2 className="text-2xl">Comment se passe une conciliation ?</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Quatre étapes, à votre rythme. Vous pouvez arrêter à tout moment.
            </p>
            <ol className="mt-5 flex flex-col">
              {steps.map((step, i) => {
                const state = i < current ? "done" : i === current ? "current" : "todo";
                return (
                  <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < steps.length - 1 && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-9 left-[17px] h-[calc(100%-2.25rem)] w-0.5",
                          state === "done" ? "bg-success" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-base font-bold",
                        state === "done" && "bg-success text-white",
                        state === "current" && "bg-primary text-white ring-4 ring-secondary",
                        state === "todo" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {state === "done" ? <Icon name="check" className="size-5" /> : i + 1}
                    </span>
                    <div className="pt-1">
                      <p className={cn("text-lg font-semibold", state === "todo" && "text-muted-foreground")}>
                        {step.title}
                        {state === "current" && <span className="sr-only"> (étape en cours)</span>}
                      </p>
                      <p className="text-base text-muted-foreground">{step.detail}</p>
                      {state === "current" && i === 0 && (
                        <Link href="/conciliateurs" className={buttonClasses({ size: "sm", className: "mt-3" })}>
                          Trouver un conciliateur
                          <Icon name="arrowRight" />
                        </Link>
                      )}
                      {state === "current" && i === 2 && (
                        <Link href="/mon-dossier" className={buttonClasses({ size: "sm", className: "mt-3" })}>
                          Voir mon dossier
                          <Icon name="arrowRight" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <h2 className="border-b border-border px-6 py-4 text-xl">Mon espace</h2>
          <ul className="divide-y divide-border">
            {shortcuts.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                    <Icon name={s.icon} className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold">{s.title}</span>
                    <span className="block text-base text-muted-foreground">{s.text}</span>
                  </span>
                  <Icon name="chevronRight" className="size-5 text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </>
  );
}
