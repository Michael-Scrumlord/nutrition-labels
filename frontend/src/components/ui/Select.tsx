// ui/Select.tsx — styled select/dropdown.

import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, id, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-text-secondary font-medium">
          {label}
        </label>
      )}
      <select
        id={id}
        className={[
          "bg-bg-base border border-border-std rounded-sm",
          "px-3 py-2 text-base text-text-primary",
          "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10",
          "transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "cursor-pointer",
          className,
        ].join(" ")}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
