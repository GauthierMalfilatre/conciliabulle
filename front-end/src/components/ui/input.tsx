import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const fieldClasses = cn(
  "w-full rounded-lg border border-border bg-card px-3.5 text-base shadow-xs transition-colors",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-12", className)} {...props} />;
}
