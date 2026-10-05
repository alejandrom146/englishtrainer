import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-amber-400 text-ink-950 hover:bg-amber-500 focus-visible:bg-amber-500",
  ghost:
    "border border-ink-700 text-mist-50 hover:border-mist-400",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 touch-manipulation items-center justify-center rounded-card px-5 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
