import Link from "next/link";
import { Suspense } from "react";
import { HelpNumber, HelpNumberFallback } from "@/components/layout";
import { Card, Icon } from "@/components/ui";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return (
    <div className="flex flex-1 justify-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Card className="p-6 sm:p-8">
          <h1 className="text-3xl">Créer un compte</h1>
          <p className="mt-2 mb-6 text-base text-muted-foreground">
            Pour prendre rendez-vous avec un conciliateur de justice. C&apos;est gratuit.
          </p>
          <Suspense>
            <RegisterForm />
          </Suspense>
          <p className="mt-6 flex items-start gap-2 text-base text-muted-foreground">
            <Icon name="phone" className="mt-1 size-5 text-primary" />
            <span>
              Vous préférez qu&apos;on vous aide ? Appelez le{" "}
              <strong className="whitespace-nowrap text-foreground">
                <Suspense fallback={<HelpNumberFallback />}>
                  <HelpNumber />
                </Suspense>
              </strong>{" "}
              (gratuit)
            </span>
          </p>
        </Card>
        <p className="px-2 text-base text-muted-foreground">
          Vous êtes conciliateur de justice ? Votre compte est créé par votre association départementale.{" "}
          <Link href="/devenir-conciliateur" className="font-semibold text-primary hover:underline">
            Devenir conciliateur
          </Link>
        </p>
      </div>
    </div>
  );
}
