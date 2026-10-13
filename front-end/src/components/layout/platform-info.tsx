import { getPlatformSettings } from "@/lib/api/reglages";
import { DEFAULT_PLATFORM } from "@/lib/api/store";
import { Icon } from "@/components/ui";
import { Container } from "./container";

/** The help line number set in Réglages du service. Wrap in <Suspense fallback={<HelpNumberFallback />}>. */
export async function HelpNumber() {
  return <>{(await getPlatformSettings()).numeroAide}</>;
}

export function HelpNumberFallback() {
  return <>{DEFAULT_PLATFORM.numeroAide}</>;
}

/** Site-wide notice (maintenance, holidays…), shown when a conciliateur turns it on. */
export async function InfoBanner() {
  const { bandeau } = await getPlatformSettings();
  if (!bandeau.actif || !bandeau.message) return null;
  return (
    <div role="status" className="border-b border-amber-300 bg-amber-100 text-amber-950 print:hidden">
      <Container className="flex items-start gap-3 py-3 text-base">
        <Icon name="alert" className="mt-1 size-5 shrink-0" />
        <p>{bandeau.message}</p>
      </Container>
    </div>
  );
}
