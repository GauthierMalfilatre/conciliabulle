import { Icon, type IconName } from "@/components/ui";
import { MODES } from "@/lib/api/referentiel";
import type { Mode } from "@/lib/api/types";

export const MODE_ICONS: Record<Mode, IconName> = {
  sur_place: "building",
  telephone: "phone",
  visio: "video",
};

export function ModeList({ modes }: { modes: Mode[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {modes.map((m) => (
        <li key={m} className="flex items-center gap-1.5">
          <Icon name={MODE_ICONS[m]} />
          {MODES[m].label}
        </li>
      ))}
    </ul>
  );
}
