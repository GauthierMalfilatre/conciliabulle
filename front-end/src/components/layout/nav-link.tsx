"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";

type NavLinkProps = { href: string; label: string; icon: IconName; /** Only the exact path is active. */ exact?: boolean };

function NavLinkBase({ href, label, icon, active }: Omit<NavLinkProps, "exact"> & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg px-3 text-base font-semibold whitespace-nowrap transition-colors",
        active ? "bg-white/15 text-white" : "text-white hover:bg-white/10",
      )}
    >
      <Icon name={icon} className="size-5" />
      <span className="max-lg:sr-only">{label}</span>
    </Link>
  );
}

function ActiveNavLink(props: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === props.href || (!props.exact && pathname.startsWith(`${props.href}/`));
  return <NavLinkBase {...props} active={active} />;
}

/** Highlights the current section. Reading the URL needs a Suspense boundary. */
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<NavLinkBase {...props} active={false} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}
