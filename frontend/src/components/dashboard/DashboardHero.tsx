import React from "react";
import { HeroCounter } from "./HeroCounter";
import { BudgetSummaryResponse } from "../../types";

interface DashboardHeroProps {
  summary: BudgetSummaryResponse;
  hideBalances?: boolean;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ summary, hideBalances = false }) => {
  const isOverBudget = summary.totalRemaining < 0;

  return (
    <div className="pt-2 pb-6">
      {/* Label: Sentence case only */}
      <p className="text-xs font-sans text-[var(--text-secondary)] mb-2">
        Total spent this month
      </p>

      {/* Very large hero figure, heavy weight, top-left, dominant */}
      <div className="font-mono text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-none tabular-nums">
        <HeroCounter value={summary.totalSpent} duration={900} masked={hideBalances} />
      </div>

      {/* Accent marker for the hero figure */}
      <div className="w-10 h-0.5 bg-[var(--accent-lime)] mt-3.5 mb-3" />

      {/* Small monospace metadata beneath it */}
      <div className="font-mono text-xs text-[var(--text-secondary)] tracking-tight flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>period: {summary.month}</span>
        <span className="text-[var(--border-strong)]">/</span>
        <span>
          remaining:{" "}
          <span className={isOverBudget ? "text-[var(--alert-red)] font-semibold" : "text-[var(--text-primary)]"}>
            {hideBalances ? (
              "₦••••••"
            ) : (
              <>
                {isOverBudget ? "-" : ""}₦{Math.abs(summary.totalRemaining).toLocaleString()}
              </>
            )}
          </span>{" "}
          of{" "}
          {hideBalances ? (
            "₦••••••"
          ) : (
            `₦${summary.totalBudget.toLocaleString()}`
          )}{" "}
          limit
        </span>
        <span className="text-[var(--border-strong)]">/</span>
        <span>{summary.overallPercentage}% utilized</span>
      </div>
    </div>
  );
};
