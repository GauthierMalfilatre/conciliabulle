import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-[#0b5aa3]",
  accent: "bg-accent text-accent-foreground hover:bg-[#fcc419]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-[#d6e8f8]",
  outline: "border border-primary bg-card text-primary hover:bg-secondary",
  ghost: "bg-transparent text-primary hover:bg-secondary",
  destructive: "bg-destructive text-destructive-foreground hover:bg-[#a50d26]",
  "destructive-outline": "border border-destructive bg-card text-destructive hover:bg-rose-50",
};

const sizes = {
  // At least 40px high, 48px for main actions: easier to hit for unsteady hands.
  sm: "h-10 px-3.5 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: Pick<ButtonProps, "variant" | "size" | "className"> = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
