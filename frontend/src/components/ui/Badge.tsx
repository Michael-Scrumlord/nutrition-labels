// ui/Badge.tsx — small tag/badge component.

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const classes =
    variant === "accent"
      ? "bg-accent/10 text-accent-text border-accent/20"
      : "bg-bg-elevated text-text-secondary border-border-std";

  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5",
        "text-xs font-medium rounded-sm border",
        classes,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
