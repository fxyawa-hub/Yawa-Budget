import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, ShieldAlert, Building2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { ErrorAlert } from "../common/ErrorAlert";
import { PaystackBank, PaystackTransferPayload, PaystackTransferResult } from "../../types";
import { getPaystackBanksApi, resolvePaystackAccountApi, sendPaystackTransferApi } from "../../api/paystack";
import { getErrorMessage } from "../../api/client";

interface SendMoneyFormProps {
  onTransferSuccess: (result: PaystackTransferResult) => void;
  categories?: string[];
}

export const SendMoneyForm: React.FC<SendMoneyFormProps> = ({
  onTransferSuccess,
  categories = [
    "Groceries",
    "Dining Out",
    "Housing & Rent",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Shopping",
    "Healthcare",
    "Other",
  ],
}) => {
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("058");
  const [selectedBankName, setSelectedBankName] = useState<string>("Guaranty Trust Bank");
  const [accountNumber, setAccountNumber] = useState<string>("0123456789");
  const [resolvedName, setResolvedName] = useState<string | null>("BABAJIDE TUNDE ADEKUNLE");
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("5000");
  const [narration, setNarration] = useState<string>("Payment for services");
  const [category, setCategory] = useState<string>("Other");
  const [recordInLedger, setRecordInLedger] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch banks on mount
  useEffect(() => {
    getPaystackBanksApi()
      .then((data) => {
        setBanks(data);
        if (data.length > 0) {
          setSelectedBankCode(data[0].code);
          setSelectedBankName(data[0].name);
        }
      })
      .catch(() => {
        // Fallback banks
        setBanks([
          { name: "Guaranty Trust Bank", slug: "guaranty-trust-bank", code: "058", active: true },
          { name: "Zenith Bank", slug: "zenith-bank", code: "057", active: true },
          { name: "Access Bank", slug: "access-bank", code: "044", active: true },
          { name: "Kuda Bank", slug: "kuda-bank", code: "50211", active: true },
          { name: "First Bank of Nigeria", slug: "first-bank-of-nigeria", code: "011", active: true },
          { name: "OPay", slug: "opay", code: "999992", active: true },
        ]);
      });
  }, []);

  // Live account number lookup when bank and 10 digits are filled
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBankCode) {
      setIsResolving(true);
      setResolveError(null);
      resolvePaystackAccountApi(accountNumber, selectedBankCode)
        .then((res) => {
          setResolvedName(res.account_name);
        })
        .catch((err) => {
          setResolvedName(null);
          setResolveError(getErrorMessage(err, "Could not resolve recipient account. Check number."));
        })
        .finally(() => {
          setIsResolving(false);
        });
    } else {
      setResolvedName(null);
      setResolveError(null);
    }
  }, [accountNumber, selectedBankCode]);

  const numAmount = parseFloat(amount) || 0;
  const transferFee = numAmount > 0 ? (numAmount <= 5000 ? 10 : 25) : 0;
  const totalDebited = numAmount > 0 ? numAmount + transferFee : 0;

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const bank = banks.find((b) => b.code === code);
    setSelectedBankCode(code);
    if (bank) {
      setSelectedBankName(bank.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resolvedName) {
      setError("Please ensure recipient account details are verified before proceeding.");
      return;
    }

    if (numAmount <= 0) {
      setError("Please enter a valid transfer amount.");
      return;
    }

    setIsLoading(true);
    try {
      const payload: PaystackTransferPayload = {
        recipientBankCode: selectedBankCode,
        recipientBankName: selectedBankName,
        accountNumber,
        accountName: resolvedName,
        amount: numAmount,
        narration: narration.trim() || undefined,
        category,
        recordInLedger,
      };

      const result = await sendPaystackTransferApi(payload);
      onTransferSuccess(result);
    } catch (err) {
      setError(getErrorMessage(err, "Transfer failed. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 space-y-6">
      <div className="pb-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>Send Money</span>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-muted)]">
              Paystack Sandbox
            </span>
          </h2>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
            Test mode bank transfer flow with live NUBAN account validation
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-secondary)]">
          <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)]" />
          <span>Test mode: Zero real money transferred</span>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Destination Bank */}
        <div className="space-y-1">
          <label htmlFor="paystack-bank-select" className="block text-xs font-mono text-[var(--text-secondary)]">
            Recipient bank
          </label>
          <select
            id="paystack-bank-select"
            value={selectedBankCode}
            onChange={handleBankChange}
            className="w-full px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
          >
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 10-digit Account Number */}
        <div className="space-y-1">
          <Input
            id="paystack-account-number"
            label="10-digit NUBAN Account Number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0123456789"
            maxLength={10}
            required
          />
        </div>
      </div>

      {/* Live Account Resolution Badge */}
      <div className="p-3 bg-[var(--bg-base)] border border-[var(--border-color)] text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Verified beneficiary:</span>
          {isResolving && (
            <span className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Resolving via Paystack...</span>
            </span>
          )}
          {!isResolving && resolvedName && (
            <span className="flex items-center gap-1 text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] font-sans font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{resolvedName}</span>
            </span>
          )}
          {!isResolving && !resolvedName && accountNumber.length < 10 && (
            <span className="text-[var(--text-muted)]">Enter 10-digit account number</span>
          )}
          {!isResolving && !resolvedName && accountNumber.length === 10 && resolveError && (
            <span className="text-[var(--alert-red)]">{resolveError}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Amount */}
        <div className="space-y-1 sm:col-span-1">
          <Input
            id="paystack-transfer-amount"
            label="Amount (₦ NGN)"
            type="number"
            min="100"
            step="50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
            required
          />
        </div>

        {/* Category */}
        <div className="space-y-1 sm:col-span-1">
          <label htmlFor="paystack-category-select" className="block text-xs font-mono text-[var(--text-secondary)]">
            Budget category
          </label>
          <select
            id="paystack-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Narration */}
        <div className="space-y-1 sm:col-span-1">
          <Input
            id="paystack-narration"
            label="Narration (optional)"
            type="text"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="e.g. Lunch split / Vendor invoice"
          />
        </div>
      </div>

      {/* Fee Breakdown and Ledger Toggle */}
      <div className="p-3.5 bg-[var(--bg-base)] border border-[var(--border-color)] text-xs font-mono space-y-2">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Transfer amount:</span>
          <span className="font-semibold text-[var(--text-primary)]">₦{numAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Paystack transfer fee (Sandbox):</span>
          <span>₦{transferFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--border-color)] pt-2 text-sm font-semibold text-[var(--text-primary)]">
          <span>Total debited (Sandbox):</span>
          <span>₦{totalDebited.toLocaleString()}</span>
        </div>

        <div className="pt-2 border-t border-[var(--border-color)] flex items-center gap-2">
          <input
            id="record-in-ledger-checkbox"
            type="checkbox"
            checked={recordInLedger}
            onChange={(e) => setRecordInLedger(e.target.checked)}
            className="rounded-xs text-[var(--accent-lime)] focus:ring-0"
          />
          <label htmlFor="record-in-ledger-checkbox" className="text-xs font-sans text-[var(--text-primary)] cursor-pointer">
            Automatically record this transfer into Yawa Budget transactions ledger under <strong>{category}</strong>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button
          id="execute-transfer-btn"
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={!resolvedName || numAmount <= 0}
          rightIcon={<Send className="w-3.5 h-3.5" />}
        >
          Send ₦{numAmount.toLocaleString()} (Test Mode)
        </Button>
      </div>
    </form>
  );
};
