"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { Button, buttonClasses, Icon } from "@/components/ui";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex max-w-xl flex-col items-center gap-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-rose-100 text-rose-700">
        <Icon name="alert" className="size-8" />
      </span>
      <h1 className="text-3xl">Un problème est survenu</h1>
      <p className="text-lg text-muted-foreground">
        Ce n&apos;est pas de votre faute. Réessayez dans un instant ; si le problème continue,
        appelez le numéro d&apos;aide indiqué en bas de la page.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => retry()}>
          Réessayer
        </Button>
        <Link href="/" className={buttonClasses({ variant: "outline", size: "lg" })}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </Container>
  );
}
