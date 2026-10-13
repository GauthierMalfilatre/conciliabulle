import Link from "next/link";
import { Card, Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";

export function StatTile({
  href,
  icon,
  label,
  value,
  highlight,
}: {
  href: string;
  icon: IconName;
  label: string;
  value: number;
  /** Draws attention when something needs handling. */
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="group block rounded-lg">
      <Card className={cn("flex items-center gap-4 p-5 transition-shadow group-hover:shadow-md", highlight && "border-warning/40 bg-amber-50")}>
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", highlight ? "bg-amber-100 text-amber-800" : "bg-secondary text-primary")}>
          <Icon name={icon} className="size-6" />
        </span>
        <span>
          <span className="block text-3xl leading-none font-bold">{value}</span>
          <span className="block text-base text-muted-foreground">{label}</span>
        </span>
      </Card>
    </Link>
  );
}
