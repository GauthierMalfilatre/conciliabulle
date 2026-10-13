import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldClasses } from "./input";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClasses, "h-12", className)} {...props} />;
}
