import React, { useState } from "react";
import { User, Check, Download, FileSpreadsheet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DeleteAccountSection } from "../components/settings/DeleteAccountSection";
import { IS_DEMO_MODE, getTransactionsApi } from "../api";
import { Button } from "../components/common/Button";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Feature: Export transactions as CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const transactions = await getTransactionsApi();

      const headers = ["Date", "Type", "Description", "Category", "Amount (NGN)"];
      const rows = transactions.map((t) => [
        `"${t.date}"`,
        `"${t.type || "EXPENSE"}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${t.category.replace(/"/g, '""')}"`,
        t.amount.toString(),
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `yawa-budget-transactions-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.warn("Failed to export transactions CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Account settings
          </h1>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
            Credentials, export, and ledger preferences
          </p>
        </div>
        {IS_DEMO_MODE && (
          <span
            id="demo-mode-badge"
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono rounded-xs border border-[var(--accent-lime)] bg-[var(--accent-lime-subtle)] text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] select-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
            Demo mode
          </span>
        )}
      </div>

      {/* Profile Overview Panel */}
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-[var(--border-color)]">
          <div className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-base)] rounded-xs">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Account profile
            </h3>
            <p className="text-xs font-mono text-[var(--text-muted)]">
              Active ledger member identity
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-3 bg-[var(--bg-base)] border border-[var(--border-color)]">
            <span className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
              Full name
            </span>
            <span className="font-medium text-[var(--text-primary)]">
              {user?.name || "Tunde Adeyemi"}
            </span>
          </div>

          <div className="p-3 bg-[var(--bg-base)] border border-[var(--border-color)]">
            <span className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
              Email address
            </span>
            <span className="font-mono text-[var(--text-primary)]">
              {user?.email || "demo@yawabudget.app"}
            </span>
          </div>
        </div>
      </div>

      {/* Feature 4: Export Data Section */}
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-[var(--border-color)]">
          <div className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-base)] rounded-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Export data
            </h3>
            <p className="text-xs font-mono text-[var(--text-muted)]">
              Download your transactions as a spreadsheet CSV
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-secondary)] max-w-sm">
            Export all recorded expenses with date, merchant description, category, and naira amounts for external analysis.
          </p>

          <Button
            id="export-csv-btn"
            type="button"
            variant="outline"
            size="sm"
            isLoading={isExporting}
            onClick={handleExportCsv}
            leftIcon={exportSuccess ? <Check className="w-3.5 h-3.5 text-[#C9F24D]" /> : <Download className="w-3.5 h-3.5" />}
          >
            {exportSuccess ? "Exported!" : "Export transactions as CSV"}
          </Button>
        </div>
      </div>

      {/* Irreversible Account Deletion with confirmation step */}
      <DeleteAccountSection />
    </div>
  );
};
