import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "alert" | "positive" | "neutral";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  className = "",
  icon,
}) => {
  const variantClasses = {
    default: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]",
    neutral: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]",
    positive: "bg-transparent text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] border-[var(--border-color)]",
    alert: "bg-[var(--alert-red-subtle)] text-[var(--alert-red)] border-[var(--alert-red)]",
  };

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[11px]",
    md: "px-2 py-0.5 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xs border font-mono tracking-tight whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
