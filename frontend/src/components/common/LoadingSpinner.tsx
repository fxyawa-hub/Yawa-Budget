import React from "react";
import { Loader2 } from "lucide-react";
import { useServerWakeStatus, SERVER_WAKING_MESSAGE } from "../../api";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading data...",
  size = "md",
  className = "",
}) => {
  const isWaking = useServerWakeStatus();

  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      id="loading-spinner-container"
      className={`flex flex-col items-center justify-center py-10 px-4 text-[var(--text-muted)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={`${sizeMap[size]} animate-spin text-[var(--primary-accent)] mb-3`} aria-hidden="true" />
      {message && <p className="text-xs font-medium text-[var(--text-secondary)] font-sans">{message}</p>}
      {isWaking && (
        <p className="text-xs font-mono text-[var(--text-muted)] mt-1.5 text-center">
          {SERVER_WAKING_MESSAGE}
        </p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
};
