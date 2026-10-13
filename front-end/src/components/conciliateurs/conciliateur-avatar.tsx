import { cn } from "@/lib/cn";

export function ConciliateurAvatar({
  nom,
  className,
}: {
  id?: string;
  nom: string;
  className?: string;
}) {
  const initials = nom
    .split(/[\s-]+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-16 shrink-0 place-items-center rounded-full bg-secondary text-xl font-bold text-secondary-foreground ring-1 ring-border",
        className,
      )}
    >
      {initials}
    </span>
  );
}
