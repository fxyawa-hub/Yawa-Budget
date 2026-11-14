import React, { useState, useEffect, useCallback } from "react";
import { Mic } from "lucide-react";
import {
  getTransactionsApi,
  createTransactionApi,
  getBudgetsApi,
  getErrorMessage,
  IS_DEMO_MODE,
  BACKEND_CATEGORIES,
} from "../api";
import { Transaction, CreateTransactionPayload } from "../types";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionList } from "../components/transactions/TransactionList";
import { Button } from "../components/common/Button";
import { VoiceTransactionPanel, isVoiceFlowSupported } from "../voiceFlow";

const DEMO_CATEGORY_LIST = [
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
  const defaultCategories = IS_DEMO_MODE ? DEMO_CATEGORY_LIST : BACKEND_CATEGORIES;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);

  const voiceSupported = isVoiceFlowSupported();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txData, budgetsData] = await Promise.all([
        getTransactionsApi(),
        getBudgetsApi().catch(() => []),
      ]);

      setTransactions(txData);

      const baseCategories = IS_DEMO_MODE ? DEMO_CATEGORY_LIST : BACKEND_CATEGORIES;
      const userCategories = budgetsData.map((b) => b.category);
      const mergedCategories = Array.from(new Set([...baseCategories, ...userCategories]));
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

  const handleTypeInstead = () => {
    setIsVoiceOpen(false);
    const input = document.getElementById("tx-desc-input") as HTMLInputElement | null;
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus();
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border-color)] flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
            Transactions
          </h1>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
            Ledger records and manual transaction entries
          </p>
        </div>

        {voiceSupported && (
          <Button
            id="talk-to-yawa-btn"
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Mic className="w-3.5 h-3.5" />}
            onClick={() => setIsVoiceOpen(true)}
            disabled={isVoiceOpen}
          >
            Talk to Yawa
          </Button>
        )}
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

      {/* Floating mobile button when voice panel is closed */}
      {voiceSupported && !isVoiceOpen && (
        <button
          id="talk-to-yawa-mobile-fab"
          type="button"
          onClick={() => setIsVoiceOpen(true)}
          className="md:hidden fixed bottom-16 right-4 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-sm border border-[var(--border-color)] bg-[var(--accent-lime)] text-[var(--accent-lime-text)] text-xs font-sans font-semibold cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Talk to Yawa</span>
        </button>
      )}

      {/* Voice conversation panel */}
      {isVoiceOpen && (
        <VoiceTransactionPanel
          onSaveTransaction={handleCreateTransaction}
          onClose={() => setIsVoiceOpen(false)}
          onTypeInstead={handleTypeInstead}
        />
      )}
    </div>
  );
};
