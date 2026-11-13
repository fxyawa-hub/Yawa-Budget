import React from "react";
import { ArrowUpRight, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { PaystackTransferResult } from "../../types";
import { Button } from "../common/Button";

interface TransferHistoryListProps {
  transfers: PaystackTransferResult[];
  isLoading: boolean;
  onRetry: () => void;
  onSelectReceipt?: (transfer: PaystackTransferResult) => void;
}

export const TransferHistoryList: React.FC<TransferHistoryListProps> = ({
  transfers,
  isLoading,
  onRetry,
  onSelectReceipt,
}) => {
  return (
    <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Transfer history
          </h3>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
            Test mode transfers executed through Paystack
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          isLoading={isLoading}
          className="text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {transfers.length === 0 ? (
        <div className="py-8 text-center text-xs font-mono text-[var(--text-muted)]">
          No transfers completed yet. Send a test transfer above to record your first transaction.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {transfers.map((t) => (
            <div
              key={t.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 border border-[var(--border-color)] bg-[var(--bg-base)] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {t.recipientName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-muted)]">
                      {t.recipientBank}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-0.5 flex flex-wrap gap-x-3">
                    <span>Ref: {t.reference}</span>
                    <span>Date: {t.date}</span>
                    {t.narration && <span className="text-[var(--text-muted)] truncate max-w-[200px]">{t.narration}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <div className="font-mono font-semibold text-sm text-[var(--text-primary)]">
                    -₦{t.amount.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">
                    +₦{t.fee} fee
                  </div>
                </div>

                {onSelectReceipt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => onSelectReceipt(t)}
                  >
                    Receipt
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
