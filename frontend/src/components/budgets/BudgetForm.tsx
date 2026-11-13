import React, { useState } from "react";
import { Plus, Tag, Check } from "lucide-react";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { ErrorAlert } from "../common/ErrorAlert";
import { SetBudgetPayload } from "../../types";

interface BudgetFormProps {
  categories: string[];
  onSubmitBudget: (payload: SetBudgetPayload) => Promise<void>;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ categories, onSubmitBudget }) => {
  const [category, setCategory] = useState<string>(categories[0] || "Groceries");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [monthlyLimit, setMonthlyLimit] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const finalCategory = isCustom ? customCategory.trim() : category.trim();

    if (!finalCategory) {
      setError("Please select or enter a category name.");
      return;
    }

    const limit = parseFloat(monthlyLimit.replace(/,/g, ""));
    if (isNaN(limit) || limit < 0) {
      setError("Please enter a valid monthly limit (0 or greater).");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitBudget({
        category: finalCategory,
        monthlyLimit: limit,
      });

      setSuccessMessage(`Monthly limit for "${finalCategory}" set to ₦${limit.toLocaleString()}.`);
      setMonthlyLimit("");
      if (isCustom) {
        setCustomCategory("");
        setIsCustom(false);
      }
    } catch {
      setError("Failed to save budget limit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="set-budget-form-card" className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 mb-8">
      <div className="pb-3 mb-4 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] font-sans">
          Set category limit
        </h3>
        <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
          Establish monthly limits in naira to govern alerts and spending ratios
        </p>
      </div>

      {error && <ErrorAlert message={error} className="mb-4" />}
      {successMessage && (
        <div className="mb-4 p-3 border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] text-xs font-mono flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {/* Category Selector */}
          <div>
            <label
              htmlFor="budget-category-select"
              className="block text-xs font-sans text-[var(--text-secondary)] mb-1"
            >
              Category
            </label>
            {!isCustom ? (
              <div className="space-y-1.5">
                <select
                  id="budget-category-select"
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustom(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full rounded-sm border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:border-[var(--text-primary)]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom category...</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  id="custom-category-input"
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  leftIcon={<Tag className="w-3.5 h-3.5" />}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCustom(false)}
                  className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                >
                  back to preset list
                </button>
              </div>
            )}
          </div>

          {/* Monthly Limit Input */}
          <Input
            id="budget-limit-input"
            label="Monthly limit (₦)"
            type="number"
            step="100"
            min="0"
            placeholder="e.g. 50000"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            className="tabular-nums font-mono"
            required
          />

          {/* Submit Button */}
          <div className="sm:pt-5">
            <Button
              id="save-budget-btn"
              type="submit"
              className="w-full sm:w-auto"
              isLoading={isSubmitting}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Save limit
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
