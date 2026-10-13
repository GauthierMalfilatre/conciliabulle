import Link from "next/link";
import { Icon } from "@/components/ui";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg py-2 pr-3 text-base font-medium text-primary hover:underline print:hidden"
    >
      <Icon name="chevronLeft" className="size-5" />
      {children}
    </Link>
  );
}
