import Link from "next/link";
import { Card, Icon } from "@/components/ui";
import { DOMAINES } from "@/lib/api/referentiel";
import type { ConciliateurWithSlots } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { ConciliateurAvatar } from "./conciliateur-avatar";
import { ModeList } from "./mode";
import { AvailabilityGrid } from "./slot-list";

export function bookingHref(slotId: string) {
  return `/rendez-vous/nouveau?creneau=${encodeURIComponent(slotId)}`;
}

export function ConciliateurCard({ conciliateur }: { conciliateur: ConciliateurWithSlots }) {
  const href = `/conciliateurs/${conciliateur.id}`;
  const { days, slots } = conciliateur.apercu;
  return (
    <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_30rem]">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex gap-4">
          <ConciliateurAvatar nom={conciliateur.nom} />
          <div>
            <h2 className="text-xl">
              <Link href={href} className="text-primary hover:underline">
                {conciliateur.nom}
              </Link>
            </h2>
            <p className="text-base">Conciliateur de justice</p>
            <p className="text-sm text-muted-foreground">
              {conciliateur.domaines.map((d) => DOMAINES[d].label).join(" · ")}
            </p>
          </div>
        </div>
        <p className="flex gap-2 text-base">
          <Icon name="mapPin" className="mt-1 size-5 text-muted-foreground" />
          <span>
            <span className="block font-semibold">{conciliateur.lieu}</span>
            {conciliateur.adresse}
            {conciliateur.accesPMR && (
              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-emerald-700">
                <Icon name="accessible" /> Accessible en fauteuil roulant
              </span>
            )}
          </span>
        </p>
        <ModeList modes={conciliateur.modes} />
        <Link
          href={href}
          className="mt-auto inline-flex w-fit items-center gap-1 text-base font-semibold text-primary hover:underline"
        >
          Voir le profil
          <Icon name="chevronRight" />
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-[#f9fafc] p-5 lg:border-t-0 lg:border-l">
        {slots.length > 0 ? (
          <>
            <AvailabilityGrid days={days} slots={slots} hrefFor={(s) => bookingHref(s.id)} maxPerDay={4} />
            <Link href={href} className="self-center py-2 text-base font-semibold text-primary hover:underline">
              Voir plus d&apos;horaires
            </Link>
          </>
        ) : conciliateur.prochainCreneau ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
            <p className="text-base text-muted-foreground">Pas de disponibilité ces prochains jours.</p>
            <Link
              href={bookingHref(conciliateur.prochainCreneau.id)}
              className="rounded-md bg-accent px-4 py-3 text-base font-semibold text-accent-foreground hover:bg-[#fcc419]"
            >
              Prochain rendez-vous : {formatDateTime(conciliateur.prochainCreneau.debut)}
            </Link>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center py-4 text-center text-base text-muted-foreground">
            {conciliateur.reservationOuverte ? "Aucune disponibilité en ligne." : "Réservation en ligne suspendue."}
            <br />
            Appelez le {conciliateur.telephone}.
          </p>
        )}
      </div>
    </Card>
  );
}
