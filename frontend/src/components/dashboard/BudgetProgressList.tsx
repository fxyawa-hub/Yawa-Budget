import React from "react";
import { motion } from "motion/react";
import { BudgetSummaryCategory } from "../../types";

interface BudgetProgressListProps {
  categories: BudgetSummaryCategory[];
  hideBalances?: boolean;
}

export const BudgetProgressList: React.FC<BudgetProgressListProps> = ({
  categories,
  hideBalances = false,
}) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="py-8 text-xs font-mono text-[var(--text-muted)]">
        no categories defined
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((cat, index) => {
        const isAlert = cat.isWarning || cat.isOverLimit;
        const barWidth = Math.min(cat.percentage, 100);

        return (
          <div
            key={cat.category}
            id={`budget-bar-${cat.category.toLowerCase().replace(/\s+/g, "-")}`}
            className="group"
          >
            {/* Header: Left label with right spent/limit in monospace */}
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-sans font-medium text-[var(--text-primary)] truncate">
                  {cat.category}
                </span>
                {isAlert && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[var(--alert-red)] text-[var(--alert-red)] bg-[var(--alert-red-subtle)] rounded-xs shrink-0">
                    {cat.isOverLimit ? "over limit" : `${cat.percentage}%`}
                  </span>
                )}
              </div>

              <div className="text-right shrink-0 font-mono text-xs text-[var(--text-secondary)] tracking-tight tabular-nums">
                <span className={isAlert ? "text-[var(--alert-red)] font-semibold" : "text-[var(--text-primary)]"}>
                  {hideBalances ? "₦••••••" : `₦${cat.spent.toLocaleString()}`}
                </span>
                <span className="text-[var(--text-muted)] mx-1.5">/</span>
                <span className="text-[var(--text-secondary)]">
                  {hideBalances ? "₦••••••" : `₦${cat.budgeted.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Thin full-width horizontal bar with staggered fill animation (60ms stagger, ease-out) */}
            <div className="w-full bg-[var(--border-color)] h-1 rounded-none overflow-hidden">
              <motion.div
                className={`h-full ${isAlert ? "bg-[var(--alert-red)]" : "bg-[var(--accent-lime)]"}`}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.06,
                  ease: "easeOut",
                }}
                role="progressbar"
                aria-valuenow={cat.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
