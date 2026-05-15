// ui/Card.tsx — standard panel/card container.

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = "", title }: CardProps) {
  return (
    <div
      className={[
        "bg-bg-surface border border-border-std rounded-md p-5",
        className,
      ].join(" ")}
    >
      {title && (
        <h2 className="text-xl font-semibold text-text-primary mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
}
