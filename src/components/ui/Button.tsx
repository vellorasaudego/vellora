import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]",
  secondary: "bg-[var(--brand-light)] text-[var(--brand-dark)] hover:bg-[#d4e9e3]",
  ghost: "bg-transparent text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-soft)]",
  danger: "bg-[var(--status-critical-bg)] text-[var(--status-critical)] hover:bg-[#f6d9d9]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
