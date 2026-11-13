import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  id?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  onRetry,
  className = "",
  id = "error-alert-banner",
}) => {
  return (
    <div
      id={id}
      className={`border border-[var(--alert-red)] bg-[var(--alert-red-subtle)] p-3 text-[var(--alert-red)] ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[var(--alert-red)] mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 text-xs leading-relaxed font-sans">
          <p className="text-[var(--alert-red)]">{message}</p>
        </div>
        {onRetry && (
          <button
            id="error-retry-button"
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded-xs border border-[var(--alert-red)] text-[var(--alert-red)] hover:bg-[var(--alert-red)] hover:text-white transition-colors focus:outline-none"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};
