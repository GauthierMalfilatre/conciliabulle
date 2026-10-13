import { Suspense } from "react";
import { Container } from "./container";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";
import { UserMenu } from "./user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-primary text-white shadow-sm print:hidden">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-primary"
      >
        Aller au contenu
      </a>
      <Container className="flex h-18 items-center justify-between gap-2 sm:gap-4">
        <Logo />
        <nav aria-label="Navigation principale" className="flex flex-1 items-center gap-0.5 sm:gap-2">
          <Suspense>
            <MainNav />
          </Suspense>
        </nav>
        <Suspense>
          <UserMenu />
        </Suspense>
      </Container>
    </header>
  );
}
