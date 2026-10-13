import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Button, Icon } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { STATUS_LABELS } from "@/lib/auth/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-base font-semibold text-primary transition-colors hover:bg-secondary"
      >
        Se connecter
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <div className="hidden text-right whitespace-nowrap 2xl:block">
        <p className="text-base font-semibold leading-tight">{user.name}</p>
        <p className="text-sm text-white">
          {STATUS_LABELS[user.status]}
        </p>
      </div>
      <span title={`${user.name} · ${STATUS_LABELS[user.status]}`} aria-hidden className="grid size-10 place-items-center rounded-full max-sm:hidden bg-white text-sm font-bold text-primary">
        {initials(user.name)}
      </span>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          className="size-11 px-0 text-white hover:bg-white/10"
          aria-label="Déconnexion"
          title="Déconnexion"
        >
          <Icon name="logout" />
        </Button>
      </form>
    </div>
  );
}
