import { useState, useEffect } from "react";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  Transaction,
  CreateTransactionPayload,
  Budget,
  BudgetSummaryCategory,
  BudgetSummaryResponse,
  SetBudgetPayload,
  CategorizePayload,
  CategorizeResponse,
  AskYawaBudgetPayload,
  AskYawaBudgetResponse,
  PaystackBank,
  PaystackResolveResponse,
  PaystackTransferPayload,
  PaystackTransferResult,
  User,
  BackendAuthResponse,
  BackendTransactionResponse,
  BackendBudgetSummaryItem,
  BackendCategorizeResponse,
  BackendAskResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Environment & Configuration
// ---------------------------------------------------------------------------
const rawBaseUrl =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || "/api";
export const API_BASE_URL: string = rawBaseUrl.replace(/\/+$/, "") || "/api";

// VITE_DEMO_MODE: When "true", uses sample data in browser storage.
// Otherwise ("false" or missing), calls the real Spring Boot backend at VITE_API_BASE_URL.
const rawDemoEnv = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_DEMO_MODE;
export const IS_DEMO_MODE: boolean =
  typeof rawDemoEnv === "string" && rawDemoEnv.trim().toLowerCase() === "true";

export const TOKEN_STORAGE_KEY = "yawabudget_jwt";
export const USER_STORAGE_KEY = "yawabudget_user";

// Exact categories supported by the Spring Boot backend
export const BACKEND_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Entertainment",
  "Other",
];

// Local storage keys for Demo Mode browser persistence
const DEMO_TX_STORAGE_KEY = "yawabudget_demo_transactions";
const DEMO_BUDGET_STORAGE_KEY = "yawabudget_demo_budgets";

// ---------------------------------------------------------------------------
// Free-Host Wake-Up Status Tracking ("Waking up the server, this can take a minute")
// ---------------------------------------------------------------------------
export const SERVER_WAKING_MESSAGE = "Waking up the server, this can take a minute";

let activeRequests = 0;
let wakingTimer: ReturnType<typeof setTimeout> | null = null;
let isServerWaking = false;
const wakingListeners = new Set<(waking: boolean) => void>();

function notifyWakingListeners(value: boolean) {
  isServerWaking = value;
  wakingListeners.forEach((listener) => {
    try {
      listener(value);
    } catch {
      // Ignore subscriber errors
    }
  });
}

function trackRequestStart() {
  if (IS_DEMO_MODE) return;
  activeRequests += 1;
  if (!wakingTimer && !isServerWaking) {
    wakingTimer = setTimeout(() => {
      if (activeRequests > 0) {
        notifyWakingListeners(true);
      }
    }, 1500);
  }
}

function trackRequestEnd() {
  if (IS_DEMO_MODE) return;
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    if (wakingTimer) {
      clearTimeout(wakingTimer);
      wakingTimer = null;
    }
    if (isServerWaking) {
      notifyWakingListeners(false);
    }
  }
}

export function subscribeServerWaking(listener: (waking: boolean) => void): () => void {
  wakingListeners.add(listener);
  listener(isServerWaking);
  return () => {
    wakingListeners.delete(listener);
  };
}

export function useServerWakeStatus(): boolean {
  const [waking, setWaking] = useState<boolean>(isServerWaking);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    return subscribeServerWaking(setWaking);
  }, []);

  return waking;
}

// ---------------------------------------------------------------------------
// Axios Client Setup (Used when IS_DEMO_MODE is false)
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000, // 120 seconds for sleeping free host cold starts
});

function isAuthPublicEndpoint(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0];
  return cleanUrl.endsWith("/auth/login") || cleanUrl.endsWith("/auth/register");
}

// Request Interceptor: Attach JWT bearer token on every request EXCEPT login & register
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    trackRequestStart();
    if (!isAuthPublicEndpoint(config.url)) {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (config.headers && "Authorization" in config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    trackRequestEnd();
    return Promise.reject(error);
  }
);

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Response Interceptor: Retry once on network error, and clear token on 401/403 for protected calls
apiClient.interceptors.response.use(
  (response) => {
    trackRequestEnd();
    return response;
  },
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    trackRequestEnd();
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    // Retry once on a network error (no HTTP response received, not cancelled, not already timed out)
    const isNetworkError =
      !error.response && !axios.isCancel(error) && error.code !== "ECONNABORTED";
    if (isNetworkError && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return apiClient(originalRequest);
    }

    // On 401 or 403 from a protected call, clear token and redirect to Login
    const status = error.response?.status;
    if ((status === 401 || status === 403) && !isAuthPublicEndpoint(originalRequest?.url)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);

      window.dispatchEvent(new CustomEvent("yawabudget:unauthorized"));

      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        window.location.href = "/login?sessionExpired=true";
      }
    }

    return Promise.reject(error);
  }
);

// Helper to extract a clean plain-sentence error message
function ensureSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function getErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred. Please try again."
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | string
      | { error?: string; message?: string; fieldErrors?: Record<string, string> }
      | undefined;

    if (typeof data === "string" && data.trim()) {
      return ensureSentence(data);
    }

    if (data && typeof data === "object") {
      if (data.fieldErrors && typeof data.fieldErrors === "object") {
        const firstFieldMsg = Object.values(data.fieldErrors).find(
          (val) => typeof val === "string" && val.trim().length > 0
        );
        if (firstFieldMsg) {
          return ensureSentence(firstFieldMsg);
        }
      }

      if (typeof data.message === "string" && data.message.trim()) {
        return ensureSentence(data.message);
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return ensureSentence(data.error);
      }
    }

    if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
      return "The server took too long to respond. Please try again.";
    }
    if (
      !error.response ||
      error.message?.includes("Network Error") ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED"
    ) {
      return "Could not reach the server. Please check your connection and try again.";
    }
    if (error.message) {
      return ensureSentence(error.message);
    }
  }
  if (error instanceof Error && error.message) {
    return ensureSentence(error.message);
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Date Helpers
// ---------------------------------------------------------------------------
const getCurrentMonthStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const getCurrentMonthDateRange = (): { start: string; end: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const monthStr = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    start: `${year}-${monthStr}-01`,
    end: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
};

// ---------------------------------------------------------------------------
// Browser Demo Mode Store & Realistic Seed Generators
// ---------------------------------------------------------------------------
const DEMO_USER: User = {
  id: "usr_demo_123",
  email: "demo@yawabudget.app",
  name: "Tunde Adeyemi",
};

const DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_mode_jwt_token_for_yawabudget_frontend";

function initDemoBudgets(): Budget[] {
  const currentMonth = getCurrentMonthStr();
  return [
    { id: "b1", userId: DEMO_USER.id, category: "Groceries", monthlyLimit: 65000, month: currentMonth, updatedAt: new Date().toISOString() },
    { id: "b2", userId: DEMO_USER.id, category: "Dining Out", monthlyLimit: 25000, month: currentMonth, updatedAt: new Date().toISOString() },
    { id: "b3", userId: DEMO_USER.id, category: "Housing & Rent", monthlyLimit: 150000, month: currentMonth, updatedAt: new Date().toISOString() },
    { id: "b4", userId: DEMO_USER.id, category: "Transportation", monthlyLimit: 30000, month: currentMonth, updatedAt: new Date().toISOString() },
    { id: "b5", userId: DEMO_USER.id, category: "Utilities", monthlyLimit: 50000, month: currentMonth, updatedAt: new Date().toISOString() },
    { id: "b6", userId: DEMO_USER.id, category: "Entertainment", monthlyLimit: 15000, month: currentMonth, updatedAt: new Date().toISOString() },
    { id: "b7", userId: DEMO_USER.id, category: "Shopping", monthlyLimit: 30000, month: currentMonth, updatedAt: new Date().toISOString() },
  ];
}

function initDemoTransactions(): Transaction[] {
  const currentMonth = getCurrentMonthStr();
  return [
    { id: "t1", userId: DEMO_USER.id, amount: 150000, description: "Monthly Apartment Rent", date: `${currentMonth}-01`, category: "Housing & Rent", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t2", userId: DEMO_USER.id, amount: 28500, description: "Shoprite Supermarket Groceries", date: `${currentMonth}-03`, category: "Groceries", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t3", userId: DEMO_USER.id, amount: 18200, description: "Spar Pantry Restock & Provisions", date: `${currentMonth}-07`, category: "Groceries", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t4", userId: DEMO_USER.id, amount: 15000, description: "Mile 12 Fresh Produce", date: `${currentMonth}-11`, category: "Groceries", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t5", userId: DEMO_USER.id, amount: 3500, description: "Mama Put Canteen Lunch", date: `${currentMonth}-04`, category: "Dining Out", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t6", userId: DEMO_USER.id, amount: 8500, description: "KFC Fast Food Meal", date: `${currentMonth}-08`, category: "Dining Out", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t7", userId: DEMO_USER.id, amount: 6000, description: "Suya Spot & Drinks with Friends", date: `${currentMonth}-12`, category: "Dining Out", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t8", userId: DEMO_USER.id, amount: 4200, description: "Bolt ride to campus", date: `${currentMonth}-02`, category: "Transportation", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t9", userId: DEMO_USER.id, amount: 1500, description: "Danfo & BRT transit fare", date: `${currentMonth}-06`, category: "Transportation", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t10", userId: DEMO_USER.id, amount: 18000, description: "TotalEnergies Fuel Refill", date: `${currentMonth}-09`, category: "Transportation", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t11", userId: DEMO_USER.id, amount: 15000, description: "MTN 5G Data & Airtime bundle", date: `${currentMonth}-05`, category: "Utilities", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t12", userId: DEMO_USER.id, amount: 20000, description: "EKEDC Prepaid Electricity Token", date: `${currentMonth}-07`, category: "Utilities", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t13", userId: DEMO_USER.id, amount: 14000, description: "DStv Monthly Subscription", date: `${currentMonth}-10`, category: "Utilities", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t14", userId: DEMO_USER.id, amount: 9000, description: "Filmhouse IMAX Cinema tickets", date: `${currentMonth}-08`, category: "Entertainment", type: "EXPENSE", createdAt: new Date().toISOString() },
    { id: "t15", userId: DEMO_USER.id, amount: 22000, description: "Jumia online order", date: `${currentMonth}-11`, category: "Shopping", type: "EXPENSE", createdAt: new Date().toISOString() },
  ];
}

function getStoredDemoTransactions(): Transaction[] {
  const raw = localStorage.getItem(DEMO_TX_STORAGE_KEY);
  if (!raw) {
    const initial = initDemoTransactions();
    localStorage.setItem(DEMO_TX_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(raw) as Transaction[];
    return parsed.map((t) => ({ ...t, type: t.type || "EXPENSE" }));
  } catch {
    return initDemoTransactions();
  }
}

function saveStoredDemoTransactions(txs: Transaction[]): void {
  localStorage.setItem(DEMO_TX_STORAGE_KEY, JSON.stringify(txs));
}

function getStoredDemoBudgets(): Budget[] {
  const raw = localStorage.getItem(DEMO_BUDGET_STORAGE_KEY);
  if (!raw) {
    const initial = initDemoBudgets();
    localStorage.setItem(DEMO_BUDGET_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as Budget[];
  } catch {
    return initDemoBudgets();
  }
}

function saveStoredDemoBudgets(budgets: Budget[]): void {
  localStorage.setItem(DEMO_BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

// ---------------------------------------------------------------------------
// 1. Authentication Endpoints
// ---------------------------------------------------------------------------
export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  if (IS_DEMO_MODE) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (normalizedEmail === "demo@yawabudget.app" && payload.password !== "password123") {
      throw new Error("Invalid password for demo account. Please use 'password123'.");
    }
    const loggedUser: User = {
      id: normalizedEmail === "demo@yawabudget.app" ? DEMO_USER.id : `usr_${Date.now()}`,
      email: normalizedEmail,
      name: normalizedEmail === "demo@yawabudget.app" ? DEMO_USER.name : normalizedEmail.split("@")[0],
    };
    return {
      token: DEMO_TOKEN,
      user: loggedUser,
    };
  }

  const response = await apiClient.post<BackendAuthResponse>("/auth/login", {
    email: payload.email.trim(),
    password: payload.password,
  });
  const data = response.data;
  return {
    token: data.token,
    user: {
      id: data.userId,
      name: data.name,
      email: payload.email.trim(),
    },
  };
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  if (IS_DEMO_MODE) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: normalizedEmail,
      name: payload.name?.trim() || normalizedEmail.split("@")[0],
    };
    return {
      token: DEMO_TOKEN,
      user: newUser,
    };
  }

  const response = await apiClient.post<BackendAuthResponse>("/auth/register", {
    name: payload.name.trim(),
    email: payload.email.trim(),
    password: payload.password,
  });
  const data = response.data;
  return {
    token: data.token,
    user: {
      id: data.userId,
      name: data.name,
      email: payload.email.trim(),
    },
  };
}

export async function deleteAccountApi(): Promise<{ message: string; success?: boolean }> {
  if (IS_DEMO_MODE) {
    localStorage.removeItem(DEMO_TX_STORAGE_KEY);
    localStorage.removeItem(DEMO_BUDGET_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    return { message: "Demo account and storage successfully reset.", success: true };
  }

  await apiClient.delete("/auth/account");
  return { message: "Account deleted successfully.", success: true };
}

// ---------------------------------------------------------------------------
// 2. Transaction Endpoints
// ---------------------------------------------------------------------------
function mapBackendTransaction(tx: BackendTransactionResponse): Transaction {
  return {
    id: tx.id,
    amount: Number(tx.amount),
    description: tx.description,
    category: tx.categoryName || "Other",
    date: tx.date,
    type: tx.type === "INCOME" ? "INCOME" : "EXPENSE",
  };
}

export async function getTransactionsApi(
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  if (IS_DEMO_MODE) {
    let txs = getStoredDemoTransactions();
    if (startDate) {
      txs = txs.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      txs = txs.filter((t) => t.date <= endDate);
    }
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const defaults = getCurrentMonthDateRange();
  const params = {
    start: startDate || defaults.start,
    end: endDate || defaults.end,
  };
  const response = await apiClient.get<BackendTransactionResponse[]>("/transactions", { params });
  const mapped = (response.data || []).map(mapBackendTransaction);
  return mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createTransactionApi(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  if (IS_DEMO_MODE) {
    let category = payload.category?.trim();
    if (!category) {
      const autoCat = await categorizeTransactionApi({ description: payload.description });
      category = autoCat.suggestedCategory;
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: DEMO_USER.id,
      amount: Number(payload.amount),
      description: payload.description.trim(),
      date: payload.date || new Date().toISOString().split("T")[0],
      category,
      type: payload.type || "EXPENSE",
      createdAt: new Date().toISOString(),
    };

    const currentTxs = getStoredDemoTransactions();
    const updated = [newTx, ...currentTxs];
    saveStoredDemoTransactions(updated);
    return newTx;
  }

  const body: {
    amount: number;
    description: string;
    categoryName?: string;
    date: string;
    type: "INCOME" | "EXPENSE";
  } = {
    amount: Number(payload.amount),
    description: payload.description.trim(),
    date: payload.date,
    type: payload.type || "EXPENSE",
  };

  if (payload.category && payload.category.trim()) {
    body.categoryName = payload.category.trim();
  }

  const response = await apiClient.post<BackendTransactionResponse>("/transactions", body);
  return mapBackendTransaction(response.data);
}

// ---------------------------------------------------------------------------
// 3. Budget Endpoints
// ---------------------------------------------------------------------------
export async function getBudgetSummaryApi(): Promise<BudgetSummaryResponse> {
  if (IS_DEMO_MODE) {
    const currentMonth = getCurrentMonthStr();
    const budgets = getStoredDemoBudgets();
    const transactions = getStoredDemoTransactions().filter(
      (t) => t.date.startsWith(currentMonth) && t.type !== "INCOME"
    );
    const totalIncome = getStoredDemoTransactions()
      .filter((t) => t.date.startsWith(currentMonth) && t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const spendingByCategory: Record<string, number> = {};
    let totalSpent = 0;
    transactions.forEach((tx) => {
      spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + tx.amount;
      totalSpent += tx.amount;
    });

    let totalBudget = 0;
    const categoriesSummary: BudgetSummaryCategory[] = budgets.map((b) => {
      const spent = spendingByCategory[b.category] || 0;
      const budgeted = b.monthlyLimit;
      totalBudget += budgeted;
      const remaining = budgeted - spent;
      const percentage = budgeted > 0 ? Math.round((spent / budgeted) * 100) : spent > 0 ? 100 : 0;
      return {
        category: b.category,
        budgeted,
        spent: Number(spent.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        percentage,
        isOverLimit: spent > budgeted,
        isWarning: percentage >= 80,
      };
    });

    const budgetedNames = new Set(budgets.map((b) => b.category));
    Object.keys(spendingByCategory).forEach((cat) => {
      if (!budgetedNames.has(cat)) {
        const spent = spendingByCategory[cat];
        categoriesSummary.push({
          category: cat,
          budgeted: 0,
          spent: Number(spent.toFixed(2)),
          remaining: -Number(spent.toFixed(2)),
          percentage: 100,
          isOverLimit: true,
          isWarning: true,
        });
      }
    });

    categoriesSummary.sort((a, b) => b.spent - a.spent);

    return {
      month: currentMonth,
      totalBudget: Number(totalBudget.toFixed(2)),
      totalSpent: Number(totalSpent.toFixed(2)),
      totalRemaining: Number((totalBudget - totalSpent).toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      overallPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      categories: categoriesSummary,
    };
  }

  // Real Spring Boot backend: derive dashboard totals from both /budgets/summary and /transactions
  const currentMonth = getCurrentMonthStr();
  const { start, end } = getCurrentMonthDateRange();

  const [summaryRes, transactions] = await Promise.all([
    apiClient.get<BackendBudgetSummaryItem[]>("/budgets/summary"),
    getTransactionsApi(start, end),
  ]);

  const summaryItems = Array.isArray(summaryRes.data) ? summaryRes.data : [];

  const expenseTxs = transactions.filter((tx) => tx.type !== "INCOME");
  const totalIncome = transactions
    .filter((tx) => tx.type === "INCOME")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const spendingByCategory: Record<string, number> = {};
  let txTotalSpent = 0;
  expenseTxs.forEach((tx) => {
    const cat = tx.category || "Other";
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + tx.amount;
    txTotalSpent += tx.amount;
  });

  let totalBudget = 0;
  const seenCategories = new Set<string>();

  const categoriesSummary: BudgetSummaryCategory[] = summaryItems.map((item) => {
    const categoryName = item.categoryName || "Other";
    seenCategories.add(categoryName);
    const limit = Number(item.limit) || 0;
    const spent = Number(item.spent) || 0;
    totalBudget += limit;
    const remaining = limit - spent;
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    return {
      category: categoryName,
      budgeted: limit,
      spent: Number(spent.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      percentage,
      isOverLimit: limit > 0 ? spent > limit : false,
      isWarning: Boolean(item.isNearingLimit),
    };
  });

  // Include expense transactions whose categories aren't yet in /budgets/summary
  Object.keys(spendingByCategory).forEach((cat) => {
    if (!seenCategories.has(cat)) {
      const spent = spendingByCategory[cat];
      categoriesSummary.push({
        category: cat,
        budgeted: 0,
        spent: Number(spent.toFixed(2)),
        remaining: -Number(spent.toFixed(2)),
        percentage: 0,
        isOverLimit: false,
        isWarning: false,
      });
    }
  });

  const summaryTotalSpent = summaryItems.reduce((sum, item) => sum + (Number(item.spent) || 0), 0);
  const totalSpent = expenseTxs.length > 0 ? txTotalSpent : summaryTotalSpent;

  categoriesSummary.sort((a, b) => b.spent - a.spent);

  return {
    month: currentMonth,
    totalBudget: Number(totalBudget.toFixed(2)),
    totalSpent: Number(totalSpent.toFixed(2)),
    totalRemaining: Number((totalBudget - totalSpent).toFixed(2)),
    totalIncome: Number(totalIncome.toFixed(2)),
    overallPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    categories: categoriesSummary,
  };
}

export async function getBudgetsApi(): Promise<Budget[]> {
  if (IS_DEMO_MODE) {
    return getStoredDemoBudgets();
  }

  // Backend contract exposes GET /budgets/summary (no GET /budgets), so derive configured budgets from it
  const currentMonth = getCurrentMonthStr();
  const response = await apiClient.get<BackendBudgetSummaryItem[]>("/budgets/summary");
  const items = Array.isArray(response.data) ? response.data : [];

  return items
    .filter((item) => Number(item.limit) > 0)
    .map((item) => ({
      id: item.categoryName,
      category: item.categoryName,
      monthlyLimit: Number(item.limit),
      month: currentMonth,
    }));
}

export async function setBudgetApi(payload: SetBudgetPayload): Promise<Budget> {
  if (IS_DEMO_MODE) {
    const currentMonth = payload.month || getCurrentMonthStr();
    const budgets = getStoredDemoBudgets();
    const catName = payload.category.trim();
    const existingIndex = budgets.findIndex((b) => b.category.toLowerCase() === catName.toLowerCase());

    let updatedBudget: Budget;
    if (existingIndex >= 0) {
      budgets[existingIndex].monthlyLimit = Number(payload.monthlyLimit);
      budgets[existingIndex].updatedAt = new Date().toISOString();
      updatedBudget = budgets[existingIndex];
    } else {
      updatedBudget = {
        id: `b_${Date.now()}`,
        userId: DEMO_USER.id,
        category: catName,
        monthlyLimit: Number(payload.monthlyLimit),
        month: currentMonth,
        updatedAt: new Date().toISOString(),
      };
      budgets.push(updatedBudget);
    }
    saveStoredDemoBudgets(budgets);
    return updatedBudget;
  }

  const categoryName = payload.category.trim();
  const monthlyLimit = Number(payload.monthlyLimit);

  // POST /budgets returns an empty response
  await apiClient.post("/budgets", {
    categoryName,
    monthlyLimit,
  });

  return {
    id: categoryName,
    category: categoryName,
    monthlyLimit,
    month: payload.month || getCurrentMonthStr(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateTransactionCategoryApi(
  id: string,
  category: string
): Promise<Transaction> {
  if (IS_DEMO_MODE) {
    const txs = getStoredDemoTransactions();
    const target = txs.find((t) => t.id === id);
    if (target) {
      target.category = category.trim();
      saveStoredDemoTransactions([...txs]);
      return target;
    }
    throw new Error("Transaction not found");
  }

  throw new Error("Editing category after creation is not supported by the backend.");
}

// ---------------------------------------------------------------------------
// 4. Categorization & Q&A Endpoints
// ---------------------------------------------------------------------------
export async function categorizeTransactionApi(
  payload: CategorizePayload
): Promise<CategorizeResponse> {
  if (IS_DEMO_MODE) {
    const desc = payload.description.trim().toLowerCase();
    let suggested = "Other";
    let explanation = `Classified based on description "${payload.description}"`;
    let confidence = 0.85;

    if (
      /(shoprite|spar|hubmart|grocery|market|supermarket|mile 12|provisions|foodstuff|produce|yam|rice|tomatoes|garri)/i.test(
        desc
      )
    ) {
      suggested = "Groceries";
      explanation = "Matched supermarket, grocery, or food provisions merchant.";
      confidence = 0.95;
    } else if (
      /(jollof|mama put|buka|amala|suya|kfc|chicken republic|mr biggs|shawarma|restaurant|cafe|coffee|lunch|dinner|breakfast|canteen|food|drink|chop|fast food)/i.test(
        desc
      )
    ) {
      suggested = "Dining Out";
      explanation = "Matched local dining, eatery, canteen, or fast food.";
      confidence = 0.95;
    } else if (/(rent|apartment|flat|housing|estate|landlord|service charge|tenancy)/i.test(desc)) {
      suggested = "Housing & Rent";
      explanation = "Identified recurring rent, tenancy, or housing fee.";
      confidence = 0.98;
    } else if (
      /(bolt|uber|danfo|brt|keke|okada|bus|fare|fuel|petrol|diesel|gas|totalenergies|oando|conoil|mobil|transit|campus|trip|ride)/i.test(
        desc
      )
    ) {
      suggested = "Transportation";
      explanation = "Matched local transit, rideshare, or fuel purchase.";
      confidence = 0.94;
    } else if (
      /(mtn|airtel|glo|9mobile|airtime|data|internet|wifi|ekedc|ikedc|nepa|electricity|token|power|dstv|gotv|startimes|water|utility|bills)/i.test(
        desc
      )
    ) {
      suggested = "Utilities";
      explanation = "Identified telecom, power token, or recurring utility bill.";
      confidence = 0.96;
    } else if (
      /(filmhouse|genesis|imax|silverbird|cinema|movie|theatre|concert|spotify|netflix|showmax|apple music|game|party|club)/i.test(
        desc
      )
    ) {
      suggested = "Entertainment";
      explanation = "Identified cinema, streaming, or leisure entertainment.";
      confidence = 0.96;
    } else if (
      /(jumia|konga|opay|palmpay|pos purchase|amazon|shoes|clothes|zara|nike|mall|boutique|electronics|phone|market)/i.test(
        desc
      )
    ) {
      suggested = "Shopping";
      explanation = "Matched retail shopping or merchandise order.";
      confidence = 0.9;
    } else if (/(pharmacy|medplus|healthplus|hospital|clinic|doctor|drugs|medicine|health)/i.test(desc)) {
      suggested = "Healthcare";
      explanation = "Matched healthcare or pharmacy expense.";
      confidence = 0.95;
    }

    return {
      suggestedCategory: suggested,
      confidence,
      explanation,
    };
  }

  const response = await apiClient.post<BackendCategorizeResponse>("/ai/categorize", {
    description: payload.description.trim(),
  });
  return {
    suggestedCategory: response.data?.category || "Other",
  };
}

export async function askYawaBudgetApi(
  payload: AskYawaBudgetPayload
): Promise<AskYawaBudgetResponse> {
  if (IS_DEMO_MODE) {
    const summary = await getBudgetSummaryApi();
    const transactions = await getTransactionsApi();
    const expenseTransactions = transactions.filter((t) => t.type !== "INCOME");
    const qLower = payload.question.trim().toLowerCase();

    let answer = "";

    if (
      qLower.includes("where can i cut") ||
      qLower.includes("where to cut") ||
      qLower.includes("cut") ||
      qLower.includes("reduce") ||
      qLower.includes("save")
    ) {
      const sortedCats = [...summary.categories].sort((a, b) => b.spent - a.spent);
      const top1 = sortedCats[0];
      const top2 = sortedCats[1];

      if (top1 && top2) {
        const suggestedCut = 10000;
        answer = `Your top 2 categories by spend are ${top1.category} (₦${top1.spent.toLocaleString()}) and ${top2.category} (₦${top2.spent.toLocaleString()}). You could cut around ₦${suggestedCut.toLocaleString()} by trimming non-essential purchases in these areas.`;
      } else if (top1) {
        answer = `Your highest spend is in ${top1.category} (₦${top1.spent.toLocaleString()}). You could cut around ₦10,000 by trimming purchases in this category.`;
      } else {
        answer = `You don't have enough recorded expenses yet to suggest cuts.`;
      }
    } else if (
      qLower.includes("largest") ||
      qLower.includes("highest expense") ||
      qLower.includes("biggest expense") ||
      qLower.includes("most expensive") ||
      qLower.includes("biggest transaction")
    ) {
      if (expenseTransactions.length > 0) {
        const sortedTxns = [...expenseTransactions].sort((a, b) => b.amount - a.amount);
        const largest = sortedTxns[0];
        answer = `Your largest expense this month was ₦${largest.amount.toLocaleString()} for "${largest.description}" (${largest.category}) on ${largest.date}.`;
      } else {
        answer = `You have no recorded expenses this month.`;
      }
    } else if (
      qLower.includes("left to spend") ||
      qLower.includes("how much is left") ||
      qLower.includes("how much left") ||
      qLower.includes("remaining") ||
      qLower.includes("safe to spend")
    ) {
      answer = `You have ₦${summary.totalRemaining.toLocaleString()} left to spend this month out of your ₦${summary.totalBudget.toLocaleString()} total monthly limit.`;
    } else if (
      qLower.includes("close") ||
      qLower.includes("over limit") ||
      qLower.includes("over their limit") ||
      qLower.includes("limit") ||
      qLower.includes("exceeded") ||
      qLower.includes("warning")
    ) {
      const overBudgetCats = summary.categories.filter((c) => c.isOverLimit);
      const warningCats = summary.categories.filter((c) => c.isWarning && !c.isOverLimit);

      if (overBudgetCats.length > 0 && warningCats.length > 0) {
        const overStr = overBudgetCats
          .map((c) => `${c.category} (spent ₦${c.spent.toLocaleString()} of ₦${c.budgeted.toLocaleString()})`)
          .join(", ");
        const warnStr = warningCats.map((c) => `${c.category} (${c.percentage}%)`).join(", ");
        answer = `You have exceeded your limit in ${overStr}, and you are close to your limit in ${warnStr}.`;
      } else if (overBudgetCats.length > 0) {
        const overStr = overBudgetCats
          .map((c) => `${c.category} (spent ₦${c.spent.toLocaleString()} of ₦${c.budgeted.toLocaleString()})`)
          .join(", ");
        answer = `You have exceeded your limit in: ${overStr}.`;
      } else if (warningCats.length > 0) {
        const warnStr = warningCats
          .map((c) => `${c.category} (spent ₦${c.spent.toLocaleString()} of ₦${c.budgeted.toLocaleString()}, ${c.percentage}%)`)
          .join(", ");
        answer = `You are close to your limit in: ${warnStr}.`;
      } else {
        answer = `No categories are close to or over their limit. All your spending is currently within budget.`;
      }
    } else if (
      qLower.includes("total spent") ||
      qLower.includes("total spend") ||
      qLower.includes("spent this month") ||
      qLower.includes("how much have i spent") ||
      qLower.includes("how much did i spend") ||
      qLower === "total"
    ) {
      answer = `You have spent ₦${summary.totalSpent.toLocaleString()} in total this month across ${expenseTransactions.length} recorded expenses.`;
    } else if (
      qLower.includes("food") ||
      qLower.includes("groceries") ||
      qLower.includes("dining") ||
      qLower.includes("transport") ||
      qLower.includes("utilities") ||
      qLower.includes("bills") ||
      qLower.includes("entertainment") ||
      qLower.includes("shopping") ||
      qLower.includes("housing") ||
      qLower.includes("rent")
    ) {
      if (qLower.includes("food")) {
        const groceries = summary.categories.find((c) => c.category === "Groceries");
        const dining = summary.categories.find((c) => c.category === "Dining Out");
        const grocSpent = groceries ? groceries.spent : 0;
        const dinSpent = dining ? dining.spent : 0;
        const totalFood = grocSpent + dinSpent;
        answer = `You have spent ₦${totalFood.toLocaleString()} on food this month: ₦${grocSpent.toLocaleString()} on Groceries and ₦${dinSpent.toLocaleString()} on Dining Out.`;
      } else if (qLower.includes("groceries")) {
        const cat = summary.categories.find((c) => c.category === "Groceries");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Groceries this month.`;
      } else if (qLower.includes("dining")) {
        const cat = summary.categories.find((c) => c.category === "Dining Out");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Dining Out this month.`;
      } else if (qLower.includes("transport")) {
        const cat = summary.categories.find((c) => c.category === "Transportation");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Transportation this month.`;
      } else if (qLower.includes("utilities") || qLower.includes("bills")) {
        const cat = summary.categories.find((c) => c.category === "Utilities");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Utilities this month.`;
      } else if (qLower.includes("housing") || qLower.includes("rent")) {
        const cat = summary.categories.find((c) => c.category === "Housing & Rent");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Housing & Rent this month.`;
      } else if (qLower.includes("entertainment")) {
        const cat = summary.categories.find((c) => c.category === "Entertainment");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Entertainment this month.`;
      } else if (qLower.includes("shopping")) {
        const cat = summary.categories.find((c) => c.category === "Shopping");
        answer = `You have spent ₦${(cat ? cat.spent : 0).toLocaleString()} on Shopping this month.`;
      }
    }

    if (!answer) {
      answer = `I can answer questions about your spending, limits and categories. Try asking how much you spent on food.`;
    }

    return { answer };
  }

  const response = await apiClient.post<BackendAskResponse>("/ai/ask", {
    question: payload.question,
  });
  return {
    answer: response.data.answer,
  };
}

// ---------------------------------------------------------------------------
// 5. Transfer Endpoints (Demo Mode Only - Not present on Spring Boot backend)
// ---------------------------------------------------------------------------
export async function getPaystackBanksApi(): Promise<PaystackBank[]> {
  if (!IS_DEMO_MODE) {
    throw new Error("Transfers are only available in demo mode.");
  }

  return [
    { name: "Guaranty Trust Bank", slug: "guaranty-trust-bank", code: "058", active: true },
    { name: "Zenith Bank", slug: "zenith-bank", code: "057", active: true },
    { name: "Access Bank", slug: "access-bank", code: "044", active: true },
    { name: "Kuda Bank", slug: "kuda-bank", code: "50211", active: true },
    { name: "First Bank of Nigeria", slug: "first-bank-of-nigeria", code: "011", active: true },
  ];
}

export async function resolveAccountApi(
  accountNumber: string,
  bankCode: string
): Promise<PaystackResolveResponse> {
  if (!IS_DEMO_MODE) {
    throw new Error("Transfers are only available in demo mode.");
  }

  return {
    account_number: accountNumber,
    account_name: "BABAJIDE TUNDE ADEKUNLE",
    bank_code: bankCode,
  };
}

export async function sendTransferApi(
  payload: PaystackTransferPayload
): Promise<PaystackTransferResult> {
  if (!IS_DEMO_MODE) {
    throw new Error("Transfers are only available in demo mode.");
  }

  return {
    id: `trf_demo_${Date.now()}`,
    reference: `TRF_snbx_${Math.random().toString(36).substring(2, 9)}`,
    status: "success",
    amount: payload.amount,
    fee: 25,
    totalDebited: payload.amount + 25,
    recipientName: payload.accountName,
    recipientBank: payload.recipientBankName,
    accountNumber: payload.accountNumber,
    narration: payload.narration || "Transfer",
    date: new Date().toISOString().split("T")[0],
  };
}

export async function getTransferHistoryApi(): Promise<PaystackTransferResult[]> {
  if (!IS_DEMO_MODE) {
    return [];
  }

  return [];
}

export default apiClient;
