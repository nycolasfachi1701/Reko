import * as React from "react";
import { cn } from "@/lib/utils";

// Primitivas de UI do produto, sobre os tokens de marca (SPEC §8).
// Base leve no espírito do shadcn/ui, customizada — reutilizada em todas as fases.

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded font-medium " +
  "transition-[background-color,border-color,opacity,transform] duration-200 ease-brand " +
  "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-[#111] hover:bg-brand-strong",
  secondary: "border border-[var(--border)] bg-surface-1 text-fg-hi hover:bg-surface-2",
  ghost: "text-fg-lo hover:bg-surface-2 hover:text-fg-hi",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonBase, buttonVariants[variant], "px-4 py-2 text-sm", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded border border-[var(--border)] bg-surface-0 px-3 py-2 text-sm text-fg-hi",
      "outline-none transition-colors duration-150 placeholder:text-fg-lo",
      "focus:border-brand",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-fg-hi", className)}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-[var(--border)] bg-surface-1", className)}
      {...props}
    />
  );
}
