import * as React from "react";
import { cn } from "@/lib/utils";

// Primitivas de UI do produto, sobre os tokens de marca (SPEC §8).

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

const buttonBase =
  "inline-flex select-none items-center justify-center gap-2 rounded-sm font-medium " +
  "transition-[background-color,border-color,box-shadow,transform,opacity] duration-200 ease-brand " +
  "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-[#111] shadow-sm hover:bg-brand-strong hover:shadow-md",
  secondary:
    "border border-[var(--border)] bg-surface-2 text-fg-hi hover:bg-surface-3 hover:border-strong",
  ghost: "text-fg-lo hover:bg-surface-2 hover:text-fg-hi",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
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
      "h-10 w-full rounded-sm border border-[var(--border)] bg-surface-2 px-3 text-sm text-fg-hi",
      "outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-lo",
      "focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-ring)]",
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
    <label className={cn("text-sm font-medium text-fg-hi", className)} {...props} />
  );
}

export function Card({
  className,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "rk-surface rounded-lg border border-[var(--border)] shadow-sm",
        hover && "lift",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}
