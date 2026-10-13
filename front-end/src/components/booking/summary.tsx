import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";

export function SummaryRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-4">
      <Icon name={icon} className="mt-1 size-6 shrink-0 text-primary" />
      <div className="text-base">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-semibold">{children}</dd>
      </div>
    </div>
  );
}

export function Summary({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col divide-y divide-border">{children}</dl>;
}
