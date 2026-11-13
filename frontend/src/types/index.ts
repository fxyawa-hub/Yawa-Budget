export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface BudgetSummaryCategory {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverLimit: boolean;
  isWarning: boolean;
}

export interface BudgetSummaryResponse {
  month: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  categories: BudgetSummaryCategory[];
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month: string;
  updatedAt: string;
}

export interface SetBudgetPayload {
  category: string;
  monthlyLimit: number;
  month?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  createdAt: string;
}

export interface CreateTransactionPayload {
  amount: number;
  description: string;
  date: string;
  category: string;
}

export interface CategorizePayload {
  description: string;
  amount?: number;
}

export interface CategorizeResponse {
  suggestedCategory: string;
  confidence?: number;
  explanation?: string;
}

export interface AskYawaBudgetPayload {
  question: string;
}

export interface AskYawaBudgetResponse {
  answer: string;
}

export interface ChatMessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: string;
}

// -------------------------------------------------------------
// Paystack Transfer Sandbox Types (Stretch Feature 2)
// -------------------------------------------------------------
export interface PaystackBank {
  name: string;
  slug: string;
  code: string;
  active: boolean;
}

export interface PaystackResolveResponse {
  account_number: string;
  account_name: string;
  bank_code: string;
}

export interface PaystackTransferPayload {
  recipientBankCode: string;
  recipientBankName: string;
  accountNumber: string;
  accountName: string;
  amount: number; // in NGN or local units
  narration?: string;
  category?: string; // option to automatically record in Yawa Budget
  recordInLedger?: boolean;
}

export interface PaystackTransferResult {
  id: string;
  reference: string;
  status: "success" | "pending" | "failed";
  amount: number;
  fee: number;
  totalDebited: number;
  recipientName: string;
  recipientBank: string;
  accountNumber: string;
  narration: string;
  date: string;
  category?: string;
  ledgerTransactionId?: string;
}
