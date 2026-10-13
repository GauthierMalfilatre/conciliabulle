import { connection } from "next/server";
import { Suspense } from "react";
import { HelpNumber, HelpNumberFallback } from "@/components/layout";
import { Card, Icon, type IconName } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

const highlights: { icon: IconName; text: string }[] = [
  { icon: "calendar", text: "Prenez rendez-vous avec un conciliateur en quelques clics" },
  { icon: "file", text: "Suivez votre dossier de conciliation en ligne" },
  { icon: "shield", text: "Vos données restent confidentielles" },
];

// Demo buttons: always in development, in production only with SHOW_DEMO_ACCOUNTS=true (read per request, not baked at build).
async function Form() {
  await connection();
  return <LoginForm demo={process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "true"} />;
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card className="p-6 sm:p-8">
          <h1 className="text-3xl">Connexion</h1>
          <p className="mt-2 mb-6 text-base text-muted-foreground">
            Accédez à votre espace personnel en quelques secondes.
          </p>
          <Suspense>
            <Form />
          </Suspense>
          <p className="mt-6 flex items-start gap-2 text-base text-muted-foreground">
            <Icon name="phone" className="mt-1 size-5 text-primary" />
            <span>
              Besoin d&apos;aide ? Appelez le{" "}
              <strong className="whitespace-nowrap text-foreground">
                <Suspense fallback={<HelpNumberFallback />}>
                  <HelpNumber />
                </Suspense>
              </strong>{" "}
              (gratuit)
            </span>
          </p>
        </Card>
        <ul className="flex flex-col gap-3 px-2">
          {highlights.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-base">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Icon name={h.icon} className="size-5" />
              </span>
              {h.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
