import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  id?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = "",
  id = "empty-state-view",
}) => {
  return (
    <div
      id={id}
      className={`flex flex-col items-start justify-center p-8 border border-[var(--border-color)] bg-[var(--bg-surface)] ${className}`}
    >
      <div className="w-8 h-8 border border-[var(--border-color)] bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-muted)] mb-3 rounded-xs">
        {icon || <FolderOpen className="w-4 h-4" />}
      </div>
      <h3 className="font-sans text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] font-sans max-w-md mb-4 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button id={`${id}-action-btn`} size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
