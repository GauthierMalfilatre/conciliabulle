import Link from "next/link";
import { Container } from "@/components/layout";
import { buttonClasses, Icon } from "@/components/ui";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <Container className="flex max-w-xl flex-col items-center gap-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-secondary text-primary">
        <Icon name="search" className="size-8" />
      </span>
      <h1 className="text-3xl">Cette page n&apos;existe pas</h1>
      <p className="text-lg text-muted-foreground">
        Le lien est peut-être incomplet, ou la page a été déplacée.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonClasses({ size: "lg" })}>
          Retour à l&apos;accueil
        </Link>
        <Link href="/conciliateurs" className={buttonClasses({ variant: "outline", size: "lg" })}>
          Trouver un conciliateur
        </Link>
      </div>
    </Container>
  );
}
