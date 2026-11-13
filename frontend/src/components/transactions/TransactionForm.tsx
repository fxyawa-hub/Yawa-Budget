import React, { useState, useRef } from "react";
import { Plus, Mic, Calendar, Tag, FileText, Check, HelpCircle } from "lucide-react";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { ErrorAlert } from "../common/ErrorAlert";
import { categorizeTransactionApi, getErrorMessage, updateTransactionCategoryApi } from "../../api";
import { CreateTransactionPayload, Transaction } from "../../types";

interface TransactionFormProps {
  categories: string[];
  onSubmitTransaction: (payload: CreateTransactionPayload) => Promise<Transaction | void>;
  onUpdateCategory?: (id: string, newCategory: string) => Promise<void>;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  onSubmitTransaction,
  onUpdateCategory,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr);
  const [category, setCategory] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Saved notification tag: "Sorted as [Category]" which user can tap to change
  const [lastSaved, setLastSaved] = useState<{
    id?: string;
    category: string;
    description: string;
  } | null>(null);
  const [isChangingCategory, setIsChangingCategory] = useState<boolean>(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState<boolean>(false);

  // Voice speech-to-text for sentence input
  const [isListeningSentence, setIsListeningSentence] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Helper to parse sentences like "jollof 2500" or "bolt to campus 4200" or "2500 jollof"
  const parseSentenceInput = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Pattern 1: Number at the end e.g. "jollof 2500" or "bolt to campus ₦4,200"
    const endNumberMatch = trimmed.match(/^(.*?)(?:\s+(?:for\s+)?(?:₦\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?))\s*$/i);
    if (endNumberMatch && endNumberMatch[1] && endNumberMatch[2]) {
      const cleanDesc = endNumberMatch[1].trim();
      const cleanAmt = endNumberMatch[2].replace(/,/g, "");
      if (cleanDesc && cleanAmt) {
        setDescription(cleanDesc);
        setAmount(cleanAmt);
        return;
      }
    }

    // Pattern 2: Number at the start e.g. "2500 jollof" or "₦4200 bolt"
    const startNumberMatch = trimmed.match(/^(?:₦\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+(?:for\s+)?(.*?)$/i);
    if (startNumberMatch && startNumberMatch[1] && startNumberMatch[2]) {
      const cleanAmt = startNumberMatch[1].replace(/,/g, "");
      const cleanDesc = startNumberMatch[2].trim();
      if (cleanAmt && cleanDesc) {
        setAmount(cleanAmt);
        setDescription(cleanDesc);
        return;
      }
    }

    // Default: just set description
    setDescription(trimmed);
  };

  const handleDescriptionChange = (val: string) => {
    // If user types or pastes something like "jollof 2500", parse it
    if (/\d+/.test(val) && !amount) {
      parseSentenceInput(val);
    } else {
      setDescription(val);
    }
  };

  const toggleSentenceSpeech = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setFormError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListeningSentence) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignored
        }
      }
      setIsListeningSentence(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || "en-US";

      recognition.onstart = () => {
        setIsListeningSentence(true);
        setFormError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          parseSentenceInput(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Sentence speech recognition error:", event.error);
        }
        setIsListeningSentence(false);
      };

      recognition.onend = () => {
        setIsListeningSentence(false);
      };

      recognition.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      setIsListeningSentence(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLastSaved(null);
    setIsChangingCategory(false);

    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }

    if (!description.trim()) {
      setFormError("Please enter a description.");
      return;
    }

    if (!date) {
      setFormError("Please choose a date.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalCategory = category.trim();

      // If category was left blank, determine it automatically
      if (!finalCategory) {
        try {
          const autoRes = await categorizeTransactionApi({
            description: description.trim(),
            amount: numAmount,
          });
          finalCategory = autoRes.suggestedCategory || "Other";
        } catch {
          finalCategory = "Other";
        }
      }

      const createdTx = await onSubmitTransaction({
        amount: numAmount,
        description: description.trim(),
        date,
        category: finalCategory,
      });

      // Show plain confirmation tag "Sorted as [Category]" which user can tap to change
      setLastSaved({
        id: (createdTx as Transaction | undefined)?.id,
        category: finalCategory,
        description: description.trim(),
      });

      // Clear input fields
      setAmount("");
      setDescription("");
      setDate(todayStr);
      setCategory("");
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to record transaction. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeCategoryConfirm = async (newCategory: string) => {
    if (!lastSaved) return;
    setIsUpdatingCategory(true);
    try {
      if (lastSaved.id) {
        await updateTransactionCategoryApi(lastSaved.id, newCategory);
        if (onUpdateCategory) {
          await onUpdateCategory(lastSaved.id, newCategory);
        }
      }
      setLastSaved({
        ...lastSaved,
        category: newCategory,
      });
      setIsChangingCategory(false);
    } catch (err) {
      console.warn("Failed to update category:", err);
      setIsChangingCategory(false);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  return (
    <div id="add-transaction-card" className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6 mb-8">
      <div className="pb-3 mb-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Add transaction
          </h3>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
            Type or speak a sentence like &ldquo;jollof 2500&rdquo; to auto-fill
          </p>
        </div>
        <div className="relative group">
          <button
            type="button"
            aria-label="How categorizing works"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-xs transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-64 p-2 bg-[var(--bg-base)] border border-[var(--border-color)] text-[11px] font-sans text-[var(--text-secondary)] shadow-none z-20">
            Leave category empty to sort automatically based on merchant or description.
          </div>
        </div>
      </div>

      {formError && <ErrorAlert message={formError} className="mb-4" />}

      {/* Confirmation tag: "Sorted as [Category]" which user can tap to change */}
      {lastSaved && (
        <div
          id="sorted-category-tag"
          className="mb-4 p-3 border border-[var(--border-color)] bg-[var(--bg-base)] flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              Saved &ldquo;{lastSaved.description}&rdquo; &middot;{" "}
            </span>
            <span className="text-xs font-mono font-medium text-[var(--text-primary)] border border-[var(--border-color)] px-1.5 py-0.5 bg-[var(--bg-surface)]">
              Sorted as {lastSaved.category}
            </span>
          </div>

          {!isChangingCategory ? (
            <button
              type="button"
              onClick={() => setIsChangingCategory(true)}
              className="text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
            >
              Change
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                defaultValue={lastSaved.category}
                onChange={(e) => handleChangeCategoryConfirm(e.target.value)}
                disabled={isUpdatingCategory}
                className="text-xs font-sans border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-primary)] rounded-xs focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsChangingCategory(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Description with voice sentence button */}
          <div className="relative">
            <Input
              id="tx-desc-input"
              label="Description"
              type="text"
              placeholder="e.g. Jollof at the canteen, Bolt to campus"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              required
            />
            <button
              type="button"
              onClick={toggleSentenceSpeech}
              title={isListeningSentence ? "Listening... click to stop" : "Say sentence (e.g. 'jollof 2500')"}
              aria-label="Speak transaction"
              className={`absolute right-2 top-7 p-1 rounded-xs transition-colors ${
                isListeningSentence
                  ? "text-[#C9F24D] animate-pulse"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Amount (₦) */}
          <Input
            id="tx-amount-input"
            label="Amount (₦)"
            type="number"
            step="1"
            min="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular-nums font-mono"
            required
          />

          {/* Date */}
          <Input
            id="tx-date-input"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
            required
          />

          {/* Optional Category */}
          <div>
            <label
              htmlFor="tx-category-select"
              className="block text-xs font-sans text-[var(--text-secondary)] mb-1"
            >
              Category <span className="text-[var(--text-muted)]">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <select
                id="tx-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-sm border border-[var(--border-color)] bg-[var(--bg-surface)] pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:border-[var(--text-primary)]"
              >
                <option value="">Sort automatically</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            id="submit-transaction-btn"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add
          </Button>
        </div>
      </form>
    </div>
  );
};
