import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  Transaction,
  CreateTransactionPayload,
  Budget,
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
} from "./types";

// ---------------------------------------------------------------------------
// Environment & Configuration
// ---------------------------------------------------------------------------
export const API_BASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || "/api";

// VITE_DEMO_MODE: Defaults to true when missing or set to "true".
// When "false", calls the real backend at VITE_API_BASE_URL.
const rawDemoEnv = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_DEMO_MODE;
export const IS_DEMO_MODE: boolean =
  rawDemoEnv === undefined || rawDemoEnv === "" || rawDemoEnv.toLowerCase() === "true";

export const TOKEN_STORAGE_KEY = "yawabudget_jwt";
export const USER_STORAGE_KEY = "yawabudget_user";

// Local storage keys for Demo Mode browser persistence
const DEMO_TX_STORAGE_KEY = "yawabudget_demo_transactions";
const DEMO_BUDGET_STORAGE_KEY = "yawabudget_demo_budgets";

// ---------------------------------------------------------------------------
// Axios Client Setup (Used when IS_DEMO_MODE is false)
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT bearer token to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (error.response?.status === 401) {
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

// Helper to extract clean error message (never shows a blank screen on backend failure)
export function getErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred"
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      if ("error" in data && typeof data.error === "string") return data.error;
      if ("message" in data && typeof data.message === "string") return data.message;
    }
    if (
      error.message?.includes("Network Error") ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED"
    ) {
      return `Backend server unreachable at ${API_BASE_URL}. Please check that your server is running.`;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Browser Demo Mode Store & Realistic Seed Generators
// ---------------------------------------------------------------------------
const DEMO_USER: User = {
  id: "usr_demo_123",
  email: "demo@yawabudget.app",
  name: "Tunde Adeyemi",
};

const DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_mode_jwt_token_for_yawabudget_frontend";

const getCurrentMonthStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

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
    { id: "t1", userId: DEMO_USER.id, amount: 150000, description: "Monthly Apartment Rent", date: `${currentMonth}-01`, category: "Housing & Rent", createdAt: new Date().toISOString() },
    { id: "t2", userId: DEMO_USER.id, amount: 28500, description: "Shoprite Supermarket Groceries", date: `${currentMonth}-03`, category: "Groceries", createdAt: new Date().toISOString() },
    { id: "t3", userId: DEMO_USER.id, amount: 18200, description: "Spar Pantry Restock & Provisions", date: `${currentMonth}-07`, category: "Groceries", createdAt: new Date().toISOString() },
    { id: "t4", userId: DEMO_USER.id, amount: 15000, description: "Mile 12 Fresh Produce", date: `${currentMonth}-11`, category: "Groceries", createdAt: new Date().toISOString() },
    { id: "t5", userId: DEMO_USER.id, amount: 3500, description: "Mama Put Canteen Lunch", date: `${currentMonth}-04`, category: "Dining Out", createdAt: new Date().toISOString() },
    { id: "t6", userId: DEMO_USER.id, amount: 8500, description: "KFC Fast Food Meal", date: `${currentMonth}-08`, category: "Dining Out", createdAt: new Date().toISOString() },
    { id: "t7", userId: DEMO_USER.id, amount: 6000, description: "Suya Spot & Drinks with Friends", date: `${currentMonth}-12`, category: "Dining Out", createdAt: new Date().toISOString() },
    { id: "t8", userId: DEMO_USER.id, amount: 4200, description: "Bolt ride to campus", date: `${currentMonth}-02`, category: "Transportation", createdAt: new Date().toISOString() },
    { id: "t9", userId: DEMO_USER.id, amount: 1500, description: "Danfo & BRT transit fare", date: `${currentMonth}-06`, category: "Transportation", createdAt: new Date().toISOString() },
    { id: "t10", userId: DEMO_USER.id, amount: 18000, description: "TotalEnergies Fuel Refill", date: `${currentMonth}-09`, category: "Transportation", createdAt: new Date().toISOString() },
    { id: "t11", userId: DEMO_USER.id, amount: 15000, description: "MTN 5G Data & Airtime bundle", date: `${currentMonth}-05`, category: "Utilities", createdAt: new Date().toISOString() },
    { id: "t12", userId: DEMO_USER.id, amount: 20000, description: "EKEDC Prepaid Electricity Token", date: `${currentMonth}-07`, category: "Utilities", createdAt: new Date().toISOString() },
    { id: "t13", userId: DEMO_USER.id, amount: 14000, description: "DStv Monthly Subscription", date: `${currentMonth}-10`, category: "Utilities", createdAt: new Date().toISOString() },
    { id: "t14", userId: DEMO_USER.id, amount: 9000, description: "Filmhouse IMAX Cinema tickets", date: `${currentMonth}-08`, category: "Entertainment", createdAt: new Date().toISOString() },
    { id: "t15", userId: DEMO_USER.id, amount: 22000, description: "Jumia online order", date: `${currentMonth}-11`, category: "Shopping", createdAt: new Date().toISOString() },
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
    return JSON.parse(raw) as Transaction[];
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

  const response = await apiClient.post<AuthResponse>("/auth/login", payload);
  return response.data;
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

  const response = await apiClient.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function deleteAccountApi(): Promise<{ message: string; success?: boolean }> {
  if (IS_DEMO_MODE) {
    localStorage.removeItem(DEMO_TX_STORAGE_KEY);
    localStorage.removeItem(DEMO_BUDGET_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    return { message: "Demo account and storage successfully reset.", success: true };
  }

  const response = await apiClient.delete<{ message: string; success?: boolean }>("/auth/account");
  return response.data;
}

// ---------------------------------------------------------------------------
// 2. Transaction Endpoints
// ---------------------------------------------------------------------------
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

  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await apiClient.get<Transaction[]>("/transactions", { params });
  return response.data;
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
      createdAt: new Date().toISOString(),
    };

    const currentTxs = getStoredDemoTransactions();
    const updated = [newTx, ...currentTxs];
    saveStoredDemoTransactions(updated);
    return newTx;
  }

  const response = await apiClient.post<Transaction>("/transactions", payload);
  return response.data;
}

// ---------------------------------------------------------------------------
// 3. Budget Endpoints
// ---------------------------------------------------------------------------
export async function getBudgetSummaryApi(): Promise<BudgetSummaryResponse> {
  if (IS_DEMO_MODE) {
    const currentMonth = getCurrentMonthStr();
    const budgets = getStoredDemoBudgets();
    const transactions = getStoredDemoTransactions().filter((t) => t.date.startsWith(currentMonth));

    const spendingByCategory: Record<string, number> = {};
    let totalSpent = 0;
    transactions.forEach((tx) => {
      spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + tx.amount;
      totalSpent += tx.amount;
    });

    let totalBudget = 0;
    const categoriesSummary = budgets.map((b) => {
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

    // Categories with spending but no explicit budget
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
      overallPercentage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      categories: categoriesSummary,
    };
  }

  const response = await apiClient.get<BudgetSummaryResponse>("/budgets/summary");
  return response.data;
}

export async function getBudgetsApi(): Promise<Budget[]> {
  if (IS_DEMO_MODE) {
    return getStoredDemoBudgets();
  }

  const response = await apiClient.get<Budget[]>("/budgets");
  return response.data;
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

  const response = await apiClient.post<Budget>("/budgets", payload);
  return response.data;
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

  const response = await apiClient.patch<Transaction>(`/transactions/${id}`, { category });
  return response.data;
}

// ---------------------------------------------------------------------------
// 4. AI Endpoints (Categorization & Natural-Language Q&A)
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

  const response = await apiClient.post<CategorizeResponse>("/ai/categorize", payload);
  return response.data;
}

export async function askYawaBudgetApi(
  payload: AskYawaBudgetPayload
): Promise<AskYawaBudgetResponse> {
  if (IS_DEMO_MODE) {
    const summary = await getBudgetSummaryApi();
    const transactions = await getTransactionsApi();
    const qLower = payload.question.trim().toLowerCase();

    let answer = "";

    // 1. "where can I cut" -> name the top 2 categories by spend and suggest a figure
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
    }
    // 2. The largest expense
    else if (
      qLower.includes("largest") ||
      qLower.includes("highest expense") ||
      qLower.includes("biggest expense") ||
      qLower.includes("most expensive") ||
      qLower.includes("biggest transaction")
    ) {
      if (transactions.length > 0) {
        const sortedTxns = [...transactions].sort((a, b) => b.amount - a.amount);
        const largest = sortedTxns[0];
        answer = `Your largest expense this month was ₦${largest.amount.toLocaleString()} for "${largest.description}" (${largest.category}) on ${largest.date}.`;
      } else {
        answer = `You have no recorded expenses this month.`;
      }
    }
    // 3. How much is left to spend
    else if (
      qLower.includes("left to spend") ||
      qLower.includes("how much is left") ||
      qLower.includes("how much left") ||
      qLower.includes("remaining") ||
      qLower.includes("safe to spend")
    ) {
      answer = `You have ₦${summary.totalRemaining.toLocaleString()} left to spend this month out of your ₦${summary.totalBudget.toLocaleString()} total monthly limit.`;
    }
    // 4. Which categories are close to or over their limit
    else if (
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
        const overStr = overBudgetCats.map((c) => `${c.category} (spent ₦${c.spent.toLocaleString()} of ₦${c.budgeted.toLocaleString()})`).join(", ");
        const warnStr = warningCats.map((c) => `${c.category} (${c.percentage}%)`).join(", ");
        answer = `You have exceeded your limit in ${overStr}, and you are close to your limit in ${warnStr}.`;
      } else if (overBudgetCats.length > 0) {
        const overStr = overBudgetCats.map((c) => `${c.category} (spent ₦${c.spent.toLocaleString()} of ₦${c.budgeted.toLocaleString()})`).join(", ");
        answer = `You have exceeded your limit in: ${overStr}.`;
      } else if (warningCats.length > 0) {
        const warnStr = warningCats.map((c) => `${c.category} (spent ₦${c.spent.toLocaleString()} of ₦${c.budgeted.toLocaleString()}, ${c.percentage}%)`).join(", ");
        answer = `You are close to your limit in: ${warnStr}.`;
      } else {
        answer = `No categories are close to or over their limit. All your spending is currently within budget.`;
      }
    }
    // 5. Total spent this month
    else if (
      qLower.includes("total spent") ||
      qLower.includes("total spend") ||
      qLower.includes("spent this month") ||
      qLower.includes("how much have i spent") ||
      qLower.includes("how much did i spend") ||
      qLower === "total"
    ) {
      answer = `You have spent ₦${summary.totalSpent.toLocaleString()} in total this month across ${transactions.length} recorded expenses.`;
    }
    // 6. Spending on a category ("how much did I spend on food", etc.)
    else if (
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
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Groceries this month.`;
      } else if (qLower.includes("dining")) {
        const cat = summary.categories.find((c) => c.category === "Dining Out");
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Dining Out this month.`;
      } else if (qLower.includes("transport")) {
        const cat = summary.categories.find((c) => c.category === "Transportation");
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Transportation this month.`;
      } else if (qLower.includes("utilities") || qLower.includes("bills")) {
        const cat = summary.categories.find((c) => c.category === "Utilities");
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Utilities this month.`;
      } else if (qLower.includes("housing") || qLower.includes("rent")) {
        const cat = summary.categories.find((c) => c.category === "Housing & Rent");
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Housing & Rent this month.`;
      } else if (qLower.includes("entertainment")) {
        const cat = summary.categories.find((c) => c.category === "Entertainment");
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Entertainment this month.`;
      } else if (qLower.includes("shopping")) {
        const cat = summary.categories.find((c) => c.category === "Shopping");
        const spent = cat ? cat.spent : 0;
        answer = `You have spent ₦${spent.toLocaleString()} on Shopping this month.`;
      }
    }

    // 7. If question isn't recognised
    if (!answer) {
      answer = `I can answer questions about your spending, limits and categories. Try asking how much you spent on food.`;
    }

    return { answer };
  }

  const response = await apiClient.post<AskYawaBudgetResponse>("/ai/ask", payload);
  return response.data;
}

// ---------------------------------------------------------------------------
// 5. Transfer Endpoints (Optional Transfers feature)
// ---------------------------------------------------------------------------
export async function getPaystackBanksApi(): Promise<PaystackBank[]> {
  if (IS_DEMO_MODE) {
    return [
      { name: "Guaranty Trust Bank", slug: "guaranty-trust-bank", code: "058", active: true },
      { name: "Zenith Bank", slug: "zenith-bank", code: "057", active: true },
      { name: "Access Bank", slug: "access-bank", code: "044", active: true },
      { name: "Kuda Bank", slug: "kuda-bank", code: "50211", active: true },
      { name: "First Bank of Nigeria", slug: "first-bank-of-nigeria", code: "011", active: true },
    ];
  }

  const response = await apiClient.get<PaystackBank[]>("/paystack/banks");
  return response.data;
}

export async function resolveAccountApi(
  accountNumber: string,
  bankCode: string
): Promise<PaystackResolveResponse> {
  if (IS_DEMO_MODE) {
    return {
      account_number: accountNumber,
      account_name: "BABAJIDE TUNDE ADEKUNLE",
      bank_code: bankCode,
    };
  }

  const response = await apiClient.get<PaystackResolveResponse>("/paystack/resolve", {
    params: { account_number: accountNumber, bank_code: bankCode },
  });
  return response.data;
}

export async function sendTransferApi(
  payload: PaystackTransferPayload
): Promise<PaystackTransferResult> {
  if (IS_DEMO_MODE) {
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

  const response = await apiClient.post<PaystackTransferResult>("/paystack/transfer", payload);
  return response.data;
}

export async function getTransferHistoryApi(): Promise<PaystackTransferResult[]> {
  if (IS_DEMO_MODE) {
    return [];
  }

  const response = await apiClient.get<PaystackTransferResult[]>("/paystack/transfers");
  return response.data;
}

export default apiClient;
