import Link from "next/link";
import { Icon } from "@/components/ui";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg">
      <span className="grid size-9 place-items-center rounded-lg bg-white text-primary">
        <Icon name="scale" className="size-5" />
      </span>
      <span className="text-xl font-bold tracking-tight max-[400px]:sr-only">ConciliaBulle</span>
    </Link>
  );
}
