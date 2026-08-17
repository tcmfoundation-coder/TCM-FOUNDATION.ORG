import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline-inverse";
export type ButtonSize = "default" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-brand-600 text-brand-700 hover:bg-brand-50",
  ghost: "text-stone-700 hover:bg-stone-100",
  // For use on dark/brand-colored backgrounds (e.g. the Get Involved band) —
  // a distinct variant rather than overriding `secondary` via className,
  // since same-specificity Tailwind utilities don't reliably override by
  // class order.
  "outline-inverse": "border border-white text-white hover:bg-white/10 focus-visible:outline-white",
};

const sizes: Record<ButtonSize, string> = {
  default: "px-5 py-2.5 text-sm",
  sm: "px-3.5 py-2 text-sm",
};

// Also usable to style a Next.js <Link> as a button: buttonStyles({ variant, size, className })
export function buttonStyles(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const { variant = "primary", size = "default", className = "" } = options;
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "default", className, ...props }: ButtonProps) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}
