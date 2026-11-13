import React from "react";
import { PieChart, Calendar } from "lucide-react";
import { Budget } from "../../types";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorAlert } from "../common/ErrorAlert";
import { EmptyState } from "../common/EmptyState";

interface BudgetListProps {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  budgets,
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-8">
        <LoadingSpinner message="Loading category limits..." />
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

  if (!budgets || budgets.length === 0) {
    return (
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
        <EmptyState
          title="No limits defined yet"
          description="Establish monthly spending limits using the form above to activate threshold alerts and ledger analytics."
          icon={<PieChart className="w-4 h-4" />}
        />
      </div>
    );
  }

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);

  return (
    <div id="budgets-list-card" className="border border-[var(--border-color)] bg-[var(--bg-surface)]">
      <div className="px-5 py-3.5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] font-sans">
            Configured limits
          </h3>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
            {budgets.length} {budgets.length === 1 ? "category" : "categories"} active
          </p>
        </div>
        <div className="text-xs font-mono text-[var(--text-secondary)] border border-[var(--border-color)] bg-[var(--bg-base)] px-2.5 py-1 self-start sm:self-auto">
          total planned:{" "}
          <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums ml-1">
            ₦{totalBudgeted.toLocaleString()}
          </span>
          <span className="text-[var(--text-muted)]"> / mo</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--border-color)]">
        {budgets.map((budget) => (
          <div
            key={budget.id}
            id={`budget-row-${budget.id}`}
            className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium text-[var(--text-primary)] font-sans">
                {budget.category}
              </p>
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] mt-0.5">
                <Calendar className="w-3 h-3" />
                <span>cycle: {budget.month}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--text-primary)]">
                ₦{budget.monthlyLimit.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] block">/ month</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
