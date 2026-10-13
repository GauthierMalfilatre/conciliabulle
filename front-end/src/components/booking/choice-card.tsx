import Link from "next/link";
import { Icon, type IconName, type Tone } from "@/components/ui";
import { cn } from "@/lib/cn";

/** A large, fully clickable option: easier to hit than a radio button. */
export function ChoiceCard({
  href,
  icon,
  title,
  description,
  selected,
}: {
  href: string;
  icon: IconName;
  /** Kept for API compatibility; options share the brand colour. */
  tone?: Tone;
  title: string;
  description?: string;
  selected?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group flex min-h-18 items-center gap-4 rounded-lg border bg-card px-5 py-4 transition-colors",
        "hover:border-primary hover:bg-secondary/50",
        selected ? "border-2 border-primary bg-secondary/50" : "border-border",
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <Icon name={icon} className="size-6" />
      </span>
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        {description && <span className="block text-base text-muted-foreground">{description}</span>}
      </span>
      <Icon name="chevronRight" className="size-6 text-primary" />
    </Link>
  );
}
