import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  default: "bg-primary text-primary-foreground",
  primary: "bg-secondary text-secondary-foreground",
  secondary: "bg-muted text-muted-foreground",
  outline: "ring-1 ring-inset ring-border",
  accent:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  info: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  violet:
    "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  success:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  warning:
    "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/25",
  destructive:
    "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
};

export type BadgeProps = ComponentProps<"span"> & {
  variant?: keyof typeof variants;
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
