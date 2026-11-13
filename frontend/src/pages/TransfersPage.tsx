import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ArrowLeftRight, History, ShieldAlert } from "lucide-react";
import { SendMoneyForm } from "../components/paystack/SendMoneyForm";
import { TransferHistoryList } from "../components/paystack/TransferHistoryList";
import { TransferReceiptModal } from "../components/paystack/TransferReceiptModal";
import { PaystackTransferResult } from "../types";
import { getTransferHistoryApi as getPaystackTransfersApi, getErrorMessage } from "../api";

export const TransfersPage: React.FC = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<PaystackTransferResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PaystackTransferResult | null>(null);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPaystackTransfersApi();
      setTransfers(data);
    } catch {
      // Fallback empty list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleTransferSuccess = (result: PaystackTransferResult) => {
    setTransfers((prev) => [result, ...prev]);
    setSelectedReceipt(result);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
            Send Money (Paystack Sandbox)
          </h1>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
            Realistic transfer flow with account lookup • Test mode money only
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-secondary)]">
          <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)]" />
          <span>Paystack Test Environment</span>
        </div>
      </div>

      {/* Form */}
      <SendMoneyForm onTransferSuccess={handleTransferSuccess} />

      {/* Transfer History */}
      <TransferHistoryList
        transfers={transfers}
        isLoading={isLoading}
        onRetry={fetchTransfers}
        onSelectReceipt={(t) => setSelectedReceipt(t)}
      />

      {/* Receipt Modal */}
      <TransferReceiptModal
        isOpen={Boolean(selectedReceipt)}
        transfer={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onViewTransactions={() => navigate("/transactions")}
      />
    </div>
  );
};
