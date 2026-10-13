import { Icon } from "@/components/ui";
import type { Mode } from "@/lib/api/types";

const COMMON = [
  "Une pièce d'identité",
  "Les documents liés à votre situation (courriers, contrats, décisions…)",
  "Vos questions, notées sur un papier pour ne rien oublier",
];

const BY_MODE: Record<Mode, string> = {
  sur_place: "Prévoir d'arriver 10 minutes en avance",
  telephone: "Être dans un endroit calme, avec un téléphone chargé",
  visio: "Le lien de connexion arrive par email la veille",
};

/** What to bring or prepare, in plain words. */
export function Checklist({ mode }: { mode: Mode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="a-preparer">
      <h2 id="a-preparer" className="text-xl font-semibold">
        À préparer
      </h2>
      <ul className="mt-4 flex flex-col gap-3 text-base">
        {[...COMMON, BY_MODE[mode]].map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Icon name="check" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
