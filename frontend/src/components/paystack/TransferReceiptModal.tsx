import React from "react";
import { X, CheckCircle2, ArrowUpRight, Receipt, ShieldCheck } from "lucide-react";
import { Button } from "../common/Button";
import { PaystackTransferResult } from "../../types";

interface TransferReceiptModalProps {
  isOpen: boolean;
  transfer: PaystackTransferResult | null;
  onClose: () => void;
  onViewTransactions?: () => void;
}

export const TransferReceiptModal: React.FC<TransferReceiptModalProps> = ({
  isOpen,
  transfer,
  onClose,
  onViewTransactions,
}) => {
  if (!isOpen || !transfer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close receipt"
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-3 pb-4 border-b border-[var(--border-color)]">
          <div className="w-12 h-12 border border-[var(--accent-lime)] bg-[var(--accent-lime-subtle)] text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-muted)]">
              Paystack Test Mode Transfer
            </span>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1.5">
              ₦{transfer.amount.toLocaleString()}
            </h3>
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              Sent to {transfer.recipientName}
            </p>
          </div>
        </div>

        {/* Transfer details */}
        <div className="py-4 space-y-2.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Status:</span>
            <span className="font-semibold text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] uppercase tracking-wider">
              {transfer.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Bank:</span>
            <span className="text-[var(--text-primary)]">{transfer.recipientBank}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Account number:</span>
            <span className="text-[var(--text-primary)] font-mono">{transfer.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Transfer fee:</span>
            <span className="text-[var(--text-primary)]">₦{transfer.fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border-color)] pt-2 font-semibold">
            <span className="text-[var(--text-muted)]">Total debited (Sandbox):</span>
            <span className="text-[var(--text-primary)]">₦{transfer.totalDebited.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Reference:</span>
            <span className="text-[var(--text-secondary)] select-all">{transfer.reference}</span>
          </div>
          {transfer.narration && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Narration:</span>
              <span className="text-[var(--text-primary)]">{transfer.narration}</span>
            </div>
          )}
          {transfer.ledgerTransactionId && (
            <div className="p-2 bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)]" />
                <span>Recorded as expense in Yawa Budget ledger</span>
              </span>
              <span className="font-mono text-[var(--text-primary)]">{transfer.category || "Other"}</span>
            </div>
          )}
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
          {onViewTransactions && transfer.ledgerTransactionId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onViewTransactions();
              }}
              rightIcon={<ArrowUpRight className="w-3 h-3" />}
            >
              View in ledger
            </Button>
          )}
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
