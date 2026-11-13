import React from "react";
import { Receipt, Calendar } from "lucide-react";
import { Transaction } from "../../types";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorAlert } from "../common/ErrorAlert";
import { EmptyState } from "../common/EmptyState";
import { Badge } from "../common/Badge";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-8">
        <LoadingSpinner message="Fetching transaction ledger..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
        <ErrorAlert message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
        <EmptyState
          title="No transactions recorded"
          description="You have not added any expenses yet. Record a manual entry above to get started."
          icon={<Receipt className="w-4 h-4" />}
        />
      </div>
    );
  }

  return (
    <div
      id="transactions-history-card"
      className="border border-[var(--border-color)] bg-[var(--bg-surface)]"
    >
      <div className="px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Past transactions
          </h3>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
            {transactions.length} recorded {transactions.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </div>

      {/* Stacked rows, never horizontally scrolling */}
      <div className="divide-y divide-[var(--border-color)]">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            id={`transaction-row-${tx.id}`}
            className="px-5 py-3 flex items-start sm:items-center justify-between gap-3 hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-sans font-medium text-[var(--text-primary)] truncate">
                {tx.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="font-mono text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                  {tx.date}
                </span>

                <Badge variant="neutral" size="sm">
                  {tx.category}
                </Badge>
              </div>
            </div>

            <div className="text-right shrink-0 pt-0.5 sm:pt-0">
              <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--text-primary)]">
                ₦{tx.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
