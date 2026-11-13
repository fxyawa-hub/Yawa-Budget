import React, { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  isConfirming?: boolean;
  confirmVariant?: "primary" | "danger";
  showIcon?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isConfirming = false,
  confirmVariant = "primary",
  showIcon = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirming) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isConfirming, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              {showIcon && (
                <div
                  className={`w-8 h-8 flex items-center justify-center shrink-0 border rounded-xs ${
                    confirmVariant === "danger"
                      ? "border-[var(--alert-red)] bg-[var(--alert-red-subtle)] text-[var(--alert-red)]"
                      : "border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)]"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              <div>
                <h3 id="modal-title" className="font-sans text-base font-semibold text-[var(--text-primary)] leading-snug">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 transition-colors disabled:opacity-40"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {children && (
            <div className="my-4 text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              {children}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border-color)]">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isConfirming}>
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                size="sm"
                onClick={onConfirm}
                isLoading={isConfirming}
              >
                {confirmText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
