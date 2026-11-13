import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-medium rounded-sm transition-colors duration-100 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const variantStyles = {
    primary:
      "bg-[var(--accent-lime)] text-[var(--accent-lime-text)] hover:bg-[var(--accent-lime-hover)] font-semibold",
    secondary:
      "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-secondary)]",
    danger:
      "border border-[var(--alert-red)] text-[var(--alert-red)] bg-transparent hover:bg-[var(--alert-red-subtle)] font-medium",
    outline:
      "border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] hover:border-[var(--text-secondary)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
  };

  const sizeStyles = {
    sm: "px-3 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-xs sm:text-sm gap-2",
    lg: "px-4 py-2 text-sm gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
