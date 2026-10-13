import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldClasses } from "./input";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldClasses, "min-h-28 py-3", className)}
      {...props}
    />
  );
}
