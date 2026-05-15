// ui/Input.tsx — styled text/number input.

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-text-secondary font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          "bg-bg-base border border-border-std rounded-sm",
          "px-3 py-2 text-base text-text-primary",
          "placeholder:text-text-tertiary",
          "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10",
          "transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className,
        ].join(" ")}
        {...props}
      />
    </div>
  );
}
