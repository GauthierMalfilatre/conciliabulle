import { Icon } from "@/components/ui";
import { DEPARTEMENTS } from "@/lib/api/referentiel";
import { cn } from "@/lib/cn";

export type SearchValues = { q?: string; departement?: string; dispo?: string };

const field = "h-14 w-full bg-transparent px-3 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none";
const chip =
  "h-11 rounded-full border border-border bg-card px-4 text-base font-medium text-foreground hover:border-primary";

/**
 * Plain GET form: criteria live in the URL, so back/forward and sharing work.
 * `variant="hero"` sits on the blue band; `variant="compact"` fits in a page.
 */
export function SearchForm({ values, withFilters = true }: { values: SearchValues; withFilters?: boolean }) {
  return (
    <form action="/conciliateurs" method="get" role="search" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl bg-card p-2 shadow-lg md:flex-row md:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-lg px-2 focus-within:ring-3 focus-within:ring-primary/30">
          <Icon name="search" className="size-6 shrink-0 text-muted-foreground" />
          <span className="sr-only">Nom du conciliateur ou ville</span>
          <input name="q" defaultValue={values.q} placeholder="Nom du conciliateur, ville…" className={field} />
        </label>
        <span aria-hidden className="mx-1 h-px bg-border md:h-10 md:w-px" />
        <label className="flex flex-1 items-center gap-2 rounded-lg px-2 focus-within:ring-3 focus-within:ring-primary/30">
          <Icon name="mapPin" className="size-6 shrink-0 text-muted-foreground" />
          <span className="sr-only">Département</span>
          <select name="departement" defaultValue={values.departement ?? ""} className={cn(field, "cursor-pointer")}>
            <option value="">Toute la France</option>
            {DEPARTEMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} – {d.nom}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-accent px-8 text-lg font-bold text-accent-foreground transition-colors hover:bg-[#fcc419]"
        >
          Rechercher
        </button>
      </div>

      {withFilters && (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Filtres</legend>
          <label className={cn(chip, "flex cursor-pointer items-center gap-2 has-checked:border-primary has-checked:bg-secondary")}>
            <input type="checkbox" name="dispo" value="1" defaultChecked={values.dispo === "1"} className="size-5 accent-[#0f6cbd]" />
            Avec des horaires libres
          </label>
          <button type="submit" className="h-11 rounded-full px-4 text-base font-semibold text-white underline-offset-4 hover:underline">
            Appliquer le filtre
          </button>
        </fieldset>
      )}
    </form>
  );
}
