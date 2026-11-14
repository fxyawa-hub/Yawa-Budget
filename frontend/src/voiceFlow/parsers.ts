export type VoiceCategory =
  | "Food"
  | "Transport"
  | "Bills"
  | "Shopping"
  | "Entertainment"
  | "Other";

export type VoiceTransactionType = "INCOME" | "EXPENSE";

export const VOICE_CATEGORIES: VoiceCategory[] = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Entertainment",
  "Other",
];

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const MULTIPLIERS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  million: 1000000,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysLocal(base: Date, deltaDays: number): Date {
  const copy = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  copy.setDate(copy.getDate() + deltaDays);
  return copy;
}

function parseNumberWordTokens(tokens: string[]): number | null {
  let total = 0;
  let current = 0;
  let sawNumber = false;

  for (const raw of tokens) {
    const token = raw.toLowerCase();
    if (token === "and") {
      continue;
    }
    if (token === "a") {
      // Only treat "a" as 1 if we haven't started or next word is a multiplier (handled by caller)
      current = 1;
      sawNumber = true;
      continue;
    }
    if (token in UNITS) {
      current += UNITS[token];
      sawNumber = true;
      continue;
    }
    if (token in TENS) {
      current += TENS[token];
      sawNumber = true;
      continue;
    }
    if (token === "hundred") {
      current = (current === 0 ? 1 : current) * 100;
      sawNumber = true;
      continue;
    }
    if (token === "thousand" || token === "million") {
      const mult = MULTIPLIERS[token];
      total += (current === 0 ? 1 : current) * mult;
      current = 0;
      sawNumber = true;
      continue;
    }
    return null;
  }

  if (!sawNumber) return null;
  const result = total + current;
  return result > 0 ? result : null;
}

function isNumberWordToken(token: string): boolean {
  const lower = token.toLowerCase();
  return (
    lower in UNITS ||
    lower in TENS ||
    lower in MULTIPLIERS ||
    lower === "and" ||
    lower === "a"
  );
}

/**
 * Parses an amount string (digits, "2,500", "2.5k", "two thousand five hundred", etc.)
 * into a positive number in naira, or null if 0 / invalid / unclear.
 */
export function parseAmount(text: string): number | null {
  return extractAmountFromText(text).amount;
}

export function extractAmountFromText(text: string): {
  amount: number | null;
  matchedText: string | null;
  remainder: string;
} {
  if (!text || !text.trim()) {
    return { amount: null, matchedText: null, remainder: text || "" };
  }

  // Normalize currency markers for matching while preserving clean remainder
  // 1. Match "2.5k", "2k", "₦2.5k", "N2k", optionally followed by "naira"
  const kMatch = text.match(
    /(?:^|\s)((?:₦|ngn|n\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*k(?:\s*(?:naira|ngn))?)(?=\s|$|[.,!?])/i
  );
  if (kMatch) {
    const rawNumeric = kMatch[2].replace(/,/g, "");
    const value = parseFloat(rawNumeric) * 1000;
    if (!isNaN(value) && value > 0) {
      const matchedText = kMatch[1].trim();
      const remainder = text.replace(kMatch[1], " ").replace(/\s+/g, " ").trim();
      return { amount: Math.round(value * 100) / 100, matchedText, remainder };
    }
  }

  // 2. Match numeric digits with optional currency prefix/suffix: "₦2,500", "N2500", "2,500 naira", "2500"
  const digitMatch = text.match(
    /(?:^|\s)((?:₦\s*|ngn\s*|n\s*(?=\d))?(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(?:naira|ngn))?)(?=\s|$|[.,!?])/i
  );
  if (digitMatch) {
    const rawNumeric = digitMatch[2].replace(/,/g, "");
    const value = parseFloat(rawNumeric);
    if (!isNaN(value) && value > 0) {
      const matchedText = digitMatch[1].trim();
      const remainder = text.replace(digitMatch[1], " ").replace(/\s+/g, " ").trim();
      return { amount: value, matchedText, remainder };
    }
    // Explicitly reject zero/non-positive digits
    return { amount: null, matchedText: null, remainder: text.trim() };
  }

  // 3. Match English number words ("two thousand five hundred", "twenty-five hundred", etc.)
  const cleaned = text
    .replace(/₦/g, " ")
    .replace(/-/g, " ")
    .replace(/\b(naira|ngn)\b/gi, " ")
    .replace(/[.,!?]/g, " ");
  const rawWords = cleaned.trim().split(/\s+/).filter(Boolean);

  // Find longest contiguous span of number words that evaluates to a valid > 0 amount
  let bestStart = -1;
  let bestEnd = -1;
  let bestAmount: number | null = null;

  for (let i = 0; i < rawWords.length; i++) {
    if (!isNumberWordToken(rawWords[i])) continue;
    // Skip leading "and" or standalone "a" unless followed by hundred/thousand/million
    const first = rawWords[i].toLowerCase();
    if (first === "and") continue;
    if (
      first === "a" &&
      (!rawWords[i + 1] || !(rawWords[i + 1].toLowerCase() in MULTIPLIERS))
    ) {
      continue;
    }

    for (let j = i; j < rawWords.length; j++) {
      if (!isNumberWordToken(rawWords[j])) break;
      const slice = rawWords.slice(i, j + 1);
      // Do not end on dangling "and" or "a"
      const last = slice[slice.length - 1].toLowerCase();
      if (last === "and" || last === "a") continue;

      const parsed = parseNumberWordTokens(slice);
      if (parsed !== null && parsed > 0) {
        if (j - i >= bestEnd - bestStart) {
          bestStart = i;
          bestEnd = j;
          bestAmount = parsed;
        }
      }
    }
  }

  if (bestAmount !== null && bestStart !== -1) {
    const matchedWords = rawWords.slice(bestStart, bestEnd + 1);
    const matchedRegex = new RegExp(
      `(?:₦\\s*)?\\b${matchedWords.join("[\\s-]+")}(?:\\s*(?:naira|ngn))?\\b`,
      "i"
    );
    const matchInOriginal = text.match(matchedRegex);
    const matchedText = matchInOriginal ? matchInOriginal[0].trim() : matchedWords.join(" ");
    const remainder = text
      .replace(matchedRegex, " ")
      .replace(/\b(naira|ngn)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { amount: bestAmount, matchedText, remainder };
  }

  return { amount: null, matchedText: null, remainder: text.trim() };
}

/**
 * Extracts a date phrase ("today", "yesterday", "two days ago", or most recent weekday)
 * and outputs yyyy-MM-dd.
 */
export function parseDate(
  text: string,
  referenceDate: Date = new Date()
): {
  date: string | null;
  matchedText: string | null;
  remainder: string;
} {
  if (!text || !text.trim()) {
    return { date: null, matchedText: null, remainder: text || "" };
  }

  // 1. "today"
  const todayMatch = text.match(/\b(?:on\s+)?today\b/i);
  if (todayMatch) {
    const remainder = text.replace(todayMatch[0], " ").replace(/\s+/g, " ").trim();
    return {
      date: formatLocalDate(referenceDate),
      matchedText: todayMatch[0],
      remainder,
    };
  }

  // 2. "yesterday"
  const yesterdayMatch = text.match(/\b(?:on\s+)?yesterday\b/i);
  if (yesterdayMatch) {
    const remainder = text.replace(yesterdayMatch[0], " ").replace(/\s+/g, " ").trim();
    return {
      date: formatLocalDate(addDaysLocal(referenceDate, -1)),
      matchedText: yesterdayMatch[0],
      remainder,
    };
  }

  // 3. "N days ago" / "two days ago" / "a day ago"
  const daysAgoMatch = text.match(
    /\b(a|an|one|two|three|four|five|six|seven|\d+)\s+days?\s+ago\b/i
  );
  if (daysAgoMatch) {
    const rawCount = daysAgoMatch[1].toLowerCase();
    let days = 0;
    if (rawCount === "a" || rawCount === "an" || rawCount === "one") {
      days = 1;
    } else if (rawCount in UNITS) {
      days = UNITS[rawCount];
    } else {
      days = parseInt(rawCount, 10);
    }

    if (!isNaN(days) && days > 0) {
      const remainder = text.replace(daysAgoMatch[0], " ").replace(/\s+/g, " ").trim();
      return {
        date: formatLocalDate(addDaysLocal(referenceDate, -days)),
        matchedText: daysAgoMatch[0],
        remainder,
      };
    }
  }

  // 4. Weekday ("Monday", "on Friday", "last Tuesday") -> most recent occurrence
  const weekdayMatch = text.match(
    /\b(?:(on|last)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i
  );
  if (weekdayMatch) {
    const modifier = (weekdayMatch[1] || "").toLowerCase();
    const targetDayName = weekdayMatch[2].toLowerCase();
    const targetDay = WEEKDAYS[targetDayName];
    const currentDay = referenceDate.getDay();

    let diff = (currentDay - targetDay + 7) % 7;
    if (modifier === "last" && diff === 0) {
      diff = 7;
    }

    const remainder = text.replace(weekdayMatch[0], " ").replace(/\s+/g, " ").trim();
    return {
      date: formatLocalDate(addDaysLocal(referenceDate, -diff)),
      matchedText: weekdayMatch[0],
      remainder,
    };
  }

  return { date: null, matchedText: null, remainder: text.trim() };
}

/**
 * Defaults to EXPENSE. Switches to INCOME only if words contain:
 * salary, allowance, received, "paid me", gift, refund, sold, income.
 */
export function detectType(text: string): VoiceTransactionType {
  if (!text) return "EXPENSE";
  const incomePattern =
    /\b(salary|allowance|received|paid me|gift|refund|sold|income)\b/i;
  return incomePattern.test(text) ? "INCOME" : "EXPENSE";
}

/**
 * Simple keyword rules for demo mode across the 6 exact categories:
 * Food, Transport, Bills, Shopping, Entertainment, Other.
 */
export function inferDemoCategory(description: string): VoiceCategory {
  const desc = description.trim().toLowerCase();
  if (!desc) return "Other";

  if (
    /\b(food|jollof|rice|mama put|buka|amala|suya|shawarma|kfc|chicken|lunch|dinner|breakfast|canteen|eatery|restaurant|groceries|shoprite|spar|market|provisions|bread|yam|garri|snack|snacks|drink|drinks|water|coffee|tea|meat|fish|beans|pizza|burger|pepper soup)\b/i.test(
      desc
    )
  ) {
    return "Food";
  }

  if (
    /\b(transport|bolt|uber|indrive|danfo|brt|keke|okada|bus|cab|taxi|fuel|petrol|diesel|totalenergies|oando|conoil|mobil|fare|trip|ride|flight|train|campus|commute)\b/i.test(
      desc
    )
  ) {
    return "Transport";
  }

  if (
    /\b(bills|bill|mtn|airtel|glo|9mobile|airtime|data|wifi|internet|ekedc|ikedc|nepa|electricity|power|token|dstv|gotv|startimes|rent|water bill|utility|utilities|subscription|phcn|light)\b/i.test(
      desc
    )
  ) {
    return "Bills";
  }

  if (
    /\b(shopping|jumia|konga|clothes|clothing|shirt|trousers|dress|shoe|shoes|sneakers|bag|watch|phone|charger|laptop|electronics|mall|boutique|store|supermarket|perfume|cosmetics|cream)\b/i.test(
      desc
    )
  ) {
    return "Shopping";
  }

  if (
    /\b(entertainment|cinema|filmhouse|genesis|imax|silverbird|movie|movies|concert|netflix|spotify|showmax|apple music|game|games|gaming|party|club|lounge|outing|hangout|ticket|tickets)\b/i.test(
      desc
    )
  ) {
    return "Entertainment";
  }

  return "Other";
}

function cleanDescriptionPhrase(raw: string): string {
  let cleaned = raw
    .replace(/[.,!?]+$/g, "")
    .replace(/^(i\s+)?(spent|paid|bought|got|purchased|had|ordered|ate|took|sent|received)\s+/i, "")
    .replace(/^(on|for|at|to|from)\s+/i, "")
    .replace(/\s+(on|for|at)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter if non-empty
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Extracts type, date, amount, and cleaned description from an utterance.
 * Order: detectType -> parseDate (so "two days ago" isn't confused for amount) -> extractAmountFromText -> clean description.
 */
export function parseInitialUtterance(
  text: string,
  referenceDate: Date = new Date()
): {
  description: string | null;
  amount: number | null;
  date: string | null;
  type: VoiceTransactionType;
} {
  const type = detectType(text);
  const dateResult = parseDate(text, referenceDate);
  const amountResult = extractAmountFromText(dateResult.remainder);
  const cleanedDesc = cleanDescriptionPhrase(amountResult.remainder);

  return {
    description: cleanedDesc.length > 0 ? cleanedDesc : null,
    amount: amountResult.amount,
    date: dateResult.date,
    type,
  };
}

export type ConfirmationIntent =
  | "yes"
  | "no"
  | "change_amount"
  | "change_date"
  | "change_description"
  | "change_category"
  | "unknown";

export function parseConfirmationIntent(text: string): ConfirmationIntent {
  const lower = text.trim().toLowerCase();
  if (!lower) return "unknown";

  if (/\b(change|edit|fix|update|wrong)\b.*\b(amount|price|money|how much)\b/i.test(lower)) {
    return "change_amount";
  }
  if (/\b(change|edit|fix|update|wrong)\b.*\b(date|day|when)\b/i.test(lower)) {
    return "change_date";
  }
  if (/\b(change|edit|fix|update|wrong)\b.*\b(description|item|what|name)\b/i.test(lower)) {
    return "change_description";
  }
  if (/\b(change|edit|fix|update|wrong)\b.*\b(category)\b/i.test(lower)) {
    return "change_category";
  }

  if (/\b(no|nope|cancel|stop|never mind|nevermind|don't|dont|abort|exit|quit)\b/i.test(lower)) {
    return "no";
  }

  if (/\b(yes|yeah|yep|yup|save|save it|okay|ok|sure|confirm|go ahead|do it|add it)\b/i.test(lower)) {
    return "yes";
  }

  return "unknown";
}

export function parseDateStepAnswer(
  text: string,
  referenceDate: Date = new Date()
): {
  status: "resolved" | "ask_which_day" | "unknown";
  date: string | null;
} {
  const lower = text.trim().toLowerCase();
  if (!lower) return { status: "unknown", date: null };

  // First see if user directly stated a date ("yesterday", "no, yesterday", "Monday", "two days ago", "today")
  const parsed = parseDate(lower, referenceDate);
  if (parsed.date) {
    return { status: "resolved", date: parsed.date };
  }

  if (/\b(yes|yeah|yep|yup|correct|right|sure|okay|ok)\b/i.test(lower)) {
    return { status: "resolved", date: formatLocalDate(referenceDate) };
  }

  if (/\b(no|nope|not today|another day|different day)\b/i.test(lower)) {
    return { status: "ask_which_day", date: null };
  }

  return { status: "unknown", date: null };
}

export function matchSpokenCategory(text: string): VoiceCategory | null {
  const lower = text.trim().toLowerCase();
  for (const cat of VOICE_CATEGORIES) {
    if (lower.includes(cat.toLowerCase())) {
      return cat;
    }
  }
  return null;
}

export function formatFriendlyDateLabel(
  isoDate: string,
  referenceDate: Date = new Date()
): string {
  const todayStr = formatLocalDate(referenceDate);
  const yesterdayStr = formatLocalDate(addDaysLocal(referenceDate, -1));
  if (isoDate === todayStr) return "today";
  if (isoDate === yesterdayStr) return "yesterday";
  return isoDate;
}
