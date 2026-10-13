import Link from "next/link";
import { Suspense } from "react";
import { Container } from "./container";
import { HelpNumber, HelpNumberFallback } from "./platform-info";

export function Footer() {
  return (
    <footer className="bg-navy py-8 text-base text-white/85 print:hidden">
      <Container className="flex flex-col justify-between gap-2 sm:flex-row">
        <span className="font-semibold text-white">ConciliaBulle</span>
        <span>
          Un accès au droit plus simple, pour tous.{" "}
          <Link href="/devenir-conciliateur" className="whitespace-nowrap underline underline-offset-4 hover:text-white">
            Devenir conciliateur
          </Link>
        </span>
        <span>
          Besoin d&apos;aide ?{" "}
          <strong className="whitespace-nowrap text-white">
            <Suspense fallback={<HelpNumberFallback />}>
              <HelpNumber />
            </Suspense>
          </strong>
        </span>
      </Container>
    </footer>
  );
}
