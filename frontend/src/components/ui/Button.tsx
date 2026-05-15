// ui/Button.tsx — reusable button with primary / secondary / danger variants.

import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-accent text-text-inverse font-semibold tracking-wide uppercase " +
    "hover:brightness-110 active:scale-[0.98] transition-[filter,transform] duration-150",
  secondary:
    "bg-bg-elevated border border-border-std text-text-primary " +
    "hover:border-border-strong hover:bg-bg-overlay transition-colors duration-150",
  danger:
    "bg-transparent border border-border-std text-text-secondary " +
    "hover:border-danger hover:text-danger transition-colors duration-150",
};

export function Button({
  variant = "secondary",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2",
        "px-5 py-2.5 text-sm rounded-sm",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
