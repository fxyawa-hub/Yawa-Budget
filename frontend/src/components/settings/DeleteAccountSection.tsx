import React, { useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { ErrorAlert } from "../common/ErrorAlert";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api";

export const DeleteAccountSection: React.FC = () => {
  const { deleteAccount, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understandChecked, setUnderstandChecked] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete account. Please try again."));
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="delete-account-danger-zone"
      className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-8 h-8 flex items-center justify-center shrink-0 border border-[var(--border-color)] text-[var(--alert-red)] bg-[var(--bg-base)] rounded-xs">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--alert-red)]">
            Delete account
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-sans mt-1 leading-relaxed max-w-xl">
            Permanently close your account (<span className="font-mono text-[var(--text-primary)]">{user?.email}</span>) and
            delete all associated budgets, transactions, and preferences. This action cannot be reversed.
          </p>

          {error && <ErrorAlert message={error} className="mt-4" />}

          <div className="mt-4">
            <Button
              id="open-delete-account-modal-btn"
              variant="danger"
              size="sm"
              onClick={() => {
                setUnderstandChecked(false);
                setError(null);
                setModalOpen(true);
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete account
            </Button>
          </div>
        </div>
      </div>

      {/* Irreversible Confirmation Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !isDeleting && setModalOpen(false)}
        title="Confirm account deletion"
        description="Are you certain you want to proceed?"
        confirmText={isDeleting ? "Deleting..." : "Permanently delete account"}
        cancelText="Cancel"
        onConfirm={understandChecked ? handleDelete : undefined}
        isConfirming={isDeleting}
        confirmVariant="danger"
        showIcon
      >
        <div className="space-y-4">
          <div className="p-3 border border-[var(--alert-red)] bg-[var(--alert-red-subtle)] text-xs text-[var(--alert-red)] leading-relaxed font-sans">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Notice
            </p>
            All recorded transactions, categorized ledger entries, and monthly budget limits will be permanently erased.
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] font-sans cursor-pointer select-none">
            <input
              id="confirm-delete-checkbox"
              type="checkbox"
              checked={understandChecked}
              onChange={(e) => setUnderstandChecked(e.target.checked)}
              className="mt-0.5 rounded-xs border-[var(--border-color)] text-[var(--alert-red)]"
            />
            <span>
              I understand that deleting my account is permanent and cannot be undone.
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
};
