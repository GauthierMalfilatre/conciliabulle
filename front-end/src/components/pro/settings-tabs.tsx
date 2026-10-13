import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/pro/parametres", label: "Horaires" },
  { href: "/pro/parametres/absences", label: "Absences" },
  { href: "/pro/parametres/profil", label: "Profil public" },
  { href: "/pro/parametres/reglages", label: "Réglages du service" },
];

export function SettingsTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Paramètres" className="flex gap-1 overflow-x-auto rounded-lg bg-white/15 p-1">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-center text-base font-semibold whitespace-nowrap transition-colors",
            t.href === current ? "bg-white text-primary" : "text-white hover:bg-white/10",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
