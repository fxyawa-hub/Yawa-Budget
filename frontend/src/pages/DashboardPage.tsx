import React, { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { Plus, SlidersHorizontal, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { getBudgetSummaryApi, getErrorMessage } from "../api";
import { BudgetSummaryResponse } from "../types";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { EmptyState } from "../components/common/EmptyState";
import { DashboardHero } from "../components/dashboard/DashboardHero";
import { BudgetProgressList } from "../components/dashboard/BudgetProgressList";

const HIDE_BALANCES_KEY = "yawabudget_hide_balances";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<BudgetSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Feature: Hide balances eye toggle
  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    return localStorage.getItem(HIDE_BALANCES_KEY) === "true";
  });

  const toggleHideBalances = () => {
    setHideBalances((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_BALANCES_KEY, String(next));
      return next;
    });
  };

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const budgetData = await getBudgetSummaryApi();
      setSummary(budgetData);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load budget summary. Please check your connection."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const alertCategories = summary?.categories.filter((c) => c.isWarning || c.isOverLimit) || [];

  // Feature: Safe to spend today
  // remaining budget divided by days left in the month, shown on the dashboard as a single number
  const computeSafeToSpendToday = () => {
    if (!summary) return { amount: 0, daysLeft: 1 };
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1); // includes current day
    const safeDaily = Math.max(0, Math.floor(summary.totalRemaining / daysLeft));
    return { amount: safeDaily, daysLeft };
  };

  const { amount: safeToSpendToday, daysLeft: daysLeftInMonth } = computeSafeToSpendToday();

  return (
    <div className="space-y-8">
      {/* Top Header: Actions & Hide-balances toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">
            Monthly overview
          </h2>
          {/* Hide balances eye icon button */}
          <button
            id="toggle-hide-balances-btn"
            type="button"
            onClick={toggleHideBalances}
            title={hideBalances ? "Show ledger balances" : "Hide ledger balances"}
            aria-label={hideBalances ? "Show ledger balances" : "Hide ledger balances"}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xs transition-colors"
          >
            {hideBalances ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Balances hidden</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Hide balances</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink
            to="/transactions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs bg-[var(--accent-lime)] text-[var(--accent-lime-text)] hover:bg-[var(--accent-lime-hover)] transition-colors select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add transaction</span>
          </NavLink>
          <NavLink
            to="/budgets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors select-none"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Manage limits</span>
          </NavLink>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-12 text-center">
          <LoadingSpinner message="Calculating ledger balances..." />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
          <ErrorAlert message={error} onRetry={fetchDashboardData} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && summary && summary.categories.length === 0 && (
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-8">
          <EmptyState
            title="No budget configured"
            description="No budget categories or recorded expenses exist for this period yet. Set your category limits to begin tracking."
            actionText="Configure limits"
            onAction={() => (window.location.href = "/budgets")}
          />
        </div>
      )}

      {/* Populated Dashboard Content */}
      {!isLoading && !error && summary && summary.categories.length > 0 && (
        <>
          {/* Dominant Hero Spending Figure */}
          <div className="border-b border-[var(--border-color)] pb-6">
            <DashboardHero summary={summary} hideBalances={hideBalances} />

            {/* Feature 1: Safe to spend today figure */}
            <div
              id="safe-to-spend-card"
              className="mt-4 p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)]" />
                  <span className="text-xs font-sans font-semibold text-[var(--text-primary)]">
                    Safe to spend today
                  </span>
                </div>
                <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                  Remaining budget spread across the {daysLeftInMonth} days left this month
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-[var(--text-primary)]">
                  {hideBalances ? "₦••••••" : `₦${safeToSpendToday.toLocaleString()}`}
                </span>
                <span className="block text-[11px] font-mono text-[var(--text-muted)]">
                  / day limit
                </span>
              </div>
            </div>
          </div>

          {/* Over 80% Threshold Warning (used only when limits reached or breached) */}
          {alertCategories.length > 0 && (
            <div
              id="budget-alert-banner"
              className="border border-[var(--alert-red)] bg-[var(--alert-red-subtle)] p-3 text-[var(--text-primary)]"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[var(--alert-red)] mt-0.5 shrink-0" />
                <div className="text-xs leading-relaxed font-sans">
                  <p className="font-semibold text-[var(--alert-red)]">
                    {alertCategories.length}{" "}
                    {alertCategories.length === 1 ? "category has" : "categories have"} reached or
                    exceeded 80% of limit
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {alertCategories.map((c) => (
                      <span
                        key={c.category}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--alert-red)] bg-[var(--bg-surface)] font-mono text-[11px] tabular-nums"
                      >
                        <span className="text-[var(--text-primary)]">{c.category}</span>
                        <span className="text-[var(--alert-red)] font-semibold">
                          {hideBalances ? "₦••••••" : `₦${c.spent.toLocaleString()}`}
                        </span>
                        <span className="text-[var(--text-muted)]">
                          / {hideBalances ? "₦••••••" : `₦${c.budgeted.toLocaleString()}`} ({c.percentage}%)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full-width budget categories section with hairline borders */}
          <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6">
            <div className="pb-3 mb-5 border-b border-[var(--border-color)] flex items-baseline justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Category limits
                </h3>
                <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                  Allowance utilization per category
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {summary.categories.length} tracked
              </span>
            </div>

            {/* Thin full-width horizontal bars */}
            <BudgetProgressList categories={summary.categories} hideBalances={hideBalances} />
          </div>
        </>
      )}
    </div>
  );
};
