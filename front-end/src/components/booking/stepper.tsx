import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Étapes de la réservation">
      <p className="sr-only">
        Étape {current + 1} sur {steps.length} : {steps[current]}
      </p>
      <ol className="flex items-center gap-2">
        {steps.map((step, i) => (
          <li key={step} className="flex flex-1 items-center gap-2" aria-current={i === current ? "step" : undefined}>
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                i < current && "bg-success text-white",
                i === current && "bg-primary text-white",
                i > current && "bg-muted text-muted-foreground",
              )}
            >
              {i < current ? <Icon name="check" /> : i + 1}
            </span>
            <span className={cn("text-base max-sm:sr-only", i === current ? "font-semibold" : "text-muted-foreground")}>
              {step}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
