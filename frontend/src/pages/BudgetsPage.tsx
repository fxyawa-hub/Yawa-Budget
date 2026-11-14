import React, { useState, useEffect, useCallback } from "react";
import {
  getBudgetsApi,
  setBudgetApi,
  getErrorMessage,
  IS_DEMO_MODE,
  BACKEND_CATEGORIES,
} from "../api";
import { Budget, SetBudgetPayload } from "../types";
import { BudgetForm } from "../components/budgets/BudgetForm";
import { BudgetList } from "../components/budgets/BudgetList";

const DEMO_CATEGORIES = [
  "Groceries",
  "Dining Out",
  "Housing & Rent",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Personal Care",
  "Other",
];

export const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBudgetsApi();
      setBudgets(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load budgets. Please check your connection."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSetBudget = async (payload: SetBudgetPayload) => {
    const updated = await setBudgetApi(payload);
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.category.toLowerCase() === updated.category.toLowerCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const baseCategories = IS_DEMO_MODE ? DEMO_CATEGORIES : BACKEND_CATEGORIES;
  const existingCategoryNames = budgets.map((b) => b.category);
  const allCategories = Array.from(new Set([...baseCategories, ...existingCategoryNames]));

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
          Monthly budgets
        </h1>
        <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
          Category limits and spending targets
        </p>
      </div>

      {/* Form to set monthly budget limit per category */}
      <BudgetForm
        categories={allCategories}
        onSubmitBudget={handleSetBudget}
      />

      {/* List of current budgets with loading, error, and empty states */}
      <BudgetList
        budgets={budgets}
        isLoading={isLoading}
        error={error}
        onRetry={fetchBudgets}
      />
    </div>
  );
};
