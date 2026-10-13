import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

const variants = {
  info: ["border-primary/15 bg-primary/5", "alert"],
  success: ["border-success/25 bg-success/5 text-success", "check"],
  warning: ["border-warning/25 bg-warning/5 text-warning", "alert"],
  destructive: ["border-destructive/25 bg-destructive/5 text-destructive", "alert"],
} satisfies Record<string, [string, IconName]>;

export type AlertProps = ComponentProps<"div"> & {
  variant?: keyof typeof variants;
  title?: string;
};

export function Alert({
  variant = "info",
  title,
  className,
  children,
  ...props
}: AlertProps) {
  const [classes, icon] = variants[variant];
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-4 text-base", classes, className)}
      {...props}
    >
      <Icon name={icon} className="mt-1 size-5" />
      <div>
        {title && <p className="mb-1 font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
