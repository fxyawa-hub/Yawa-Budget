import React, { useState, useEffect, useCallback } from "react";
import { getTransactionsApi, createTransactionApi, getBudgetsApi, getErrorMessage } from "../api";
import { Transaction, CreateTransactionPayload } from "../types";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionList } from "../components/transactions/TransactionList";

const DEFAULT_CATEGORY_LIST = [
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

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORY_LIST);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txData, budgetsData] = await Promise.all([
        getTransactionsApi(),
        getBudgetsApi().catch(() => []),
      ]);

      setTransactions(txData);

      // Merge predefined categories with user's specific budget categories
      const userCategories = budgetsData.map((b) => b.category);
      const mergedCategories = Array.from(
        new Set([...DEFAULT_CATEGORY_LIST, ...userCategories])
      );
      setCategories(mergedCategories);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load transactions. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTransaction = async (payload: CreateTransactionPayload) => {
    const created = await createTransactionApi(payload);
    setTransactions((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateCategory = async (id: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t))
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
          Transactions
        </h1>
        <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
          Ledger records and manual transaction entries
        </p>
      </div>

      {/* Form to add manual transaction */}
      <TransactionForm
        categories={categories}
        onSubmitTransaction={handleCreateTransaction}
        onUpdateCategory={handleUpdateCategory}
      />

      {/* List of past transactions */}
      <TransactionList
        transactions={transactions}
        isLoading={isLoading}
        error={error}
        onRetry={fetchData}
      />
    </div>
  );
};
