import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount,
  parseDate,
  detectType,
  inferDemoCategory,
  parseInitialUtterance,
  parseConfirmationIntent,
  parseDateStepAnswer,
  matchSpokenCategory,
  formatFriendlyDateLabel,
} from "./parsers";

describe("parseAmount", () => {
  it("parses plain and comma-separated digits", () => {
    assert.equal(parseAmount("2500"), 2500);
    assert.equal(parseAmount("2,500"), 2500);
    assert.equal(parseAmount("150,000"), 150000);
    assert.equal(parseAmount("1250.50"), 1250.5);
  });

  it("strips naira, ₦, and N currency markers", () => {
    assert.equal(parseAmount("₦2,500"), 2500);
    assert.equal(parseAmount("₦ 4500"), 4500);
    assert.equal(parseAmount("N2500"), 2500);
    assert.equal(parseAmount("N 3,200"), 3200);
    assert.equal(parseAmount("2500 naira"), 2500);
    assert.equal(parseAmount("5,000 Naira"), 5000);
  });

  it("parses k shorthand", () => {
    assert.equal(parseAmount("2k"), 2000);
    assert.equal(parseAmount("2.5k"), 2500);
    assert.equal(parseAmount("₦12.5k"), 12500);
    assert.equal(parseAmount("3k naira"), 3000);
  });

  it("parses English number words", () => {
    assert.equal(parseAmount("two thousand five hundred"), 2500);
    assert.equal(parseAmount("two thousand five hundred naira"), 2500);
    assert.equal(parseAmount("twenty five hundred"), 2500);
    assert.equal(parseAmount("twenty-five hundred"), 2500);
    assert.equal(parseAmount("five hundred"), 500);
    assert.equal(parseAmount("fifteen thousand"), 15000);
    assert.equal(parseAmount("one hundred and twenty thousand"), 120000);
  });

  it("rejects zero and unclear amounts", () => {
    assert.equal(parseAmount("0"), null);
    assert.equal(parseAmount("0 naira"), null);
    assert.equal(parseAmount("zero"), null);
    assert.equal(parseAmount("zero naira"), null);
    assert.equal(parseAmount(""), null);
    assert.equal(parseAmount("jollof rice"), null);
  });
});

describe("parseDate", () => {
  // Fixed reference: Wednesday, 2026-05-13
  const ref = new Date(2026, 4, 13, 12, 0, 0);

  it("parses today, yesterday, and N days ago", () => {
    assert.equal(parseDate("today", ref).date, "2026-05-13");
    assert.equal(parseDate("yesterday", ref).date, "2026-05-12");
    assert.equal(parseDate("two days ago", ref).date, "2026-05-11");
    assert.equal(parseDate("3 days ago", ref).date, "2026-05-10");
  });

  it("parses weekdays as the most recent occurrence", () => {
    // Ref is Wednesday 2026-05-13 -> Monday is 2026-05-11, Friday is 2026-05-08
    assert.equal(parseDate("Monday", ref).date, "2026-05-11");
    assert.equal(parseDate("on Friday", ref).date, "2026-05-08");
    assert.equal(parseDate("Wednesday", ref).date, "2026-05-13");
    assert.equal(parseDate("last Wednesday", ref).date, "2026-05-06");
  });

  it("returns null when no date is spoken", () => {
    assert.equal(parseDate("jollof 2500", ref).date, null);
  });
});

describe("detectType", () => {
  it("defaults to EXPENSE", () => {
    assert.equal(detectType("Jollof rice at mama put"), "EXPENSE");
    assert.equal(detectType("Bolt to campus"), "EXPENSE");
  });

  it("switches to INCOME on income keywords", () => {
    assert.equal(detectType("Monthly salary"), "INCOME");
    assert.equal(detectType("Upkeep allowance"), "INCOME");
    assert.equal(detectType("Received transfer from Tunde"), "INCOME");
    assert.equal(detectType("Client paid me for logo"), "INCOME");
    assert.equal(detectType("Birthday gift"), "INCOME");
    assert.equal(detectType("Jumia refund"), "INCOME");
    assert.equal(detectType("Sold old monitor"), "INCOME");
    assert.equal(detectType("Side income"), "INCOME");
  });
});

describe("inferDemoCategory", () => {
  it("maps descriptions into the 6 allowed categories", () => {
    assert.equal(inferDemoCategory("Jollof at the canteen"), "Food");
    assert.equal(inferDemoCategory("Shoprite groceries"), "Food");
    assert.equal(inferDemoCategory("Bolt to campus"), "Transport");
    assert.equal(inferDemoCategory("MTN airtime"), "Bills");
    assert.equal(inferDemoCategory("EKEDC token"), "Bills");
    assert.equal(inferDemoCategory("Jumia shoes"), "Shopping");
    assert.equal(inferDemoCategory("Filmhouse cinema ticket"), "Entertainment");
    assert.equal(inferDemoCategory("Haircut at salon"), "Other");
  });
});

describe("parseInitialUtterance", () => {
  const ref = new Date(2026, 4, 13, 12, 0, 0);

  it("extracts description only when only description is spoken", () => {
    const res = parseInitialUtterance("Jollof at the canteen", ref);
    assert.equal(res.description, "Jollof at the canteen");
    assert.equal(res.amount, null);
    assert.equal(res.date, null);
    assert.equal(res.type, "EXPENSE");
  });

  it("fills multi-slot utterance with description, amount, and date", () => {
    const res = parseInitialUtterance("Bolt to campus 2.5k yesterday", ref);
    assert.equal(res.description, "Bolt to campus");
    assert.equal(res.amount, 2500);
    assert.equal(res.date, "2026-05-12");
    assert.equal(res.type, "EXPENSE");
  });

  it("handles two days ago without confusing two as the amount", () => {
    const res = parseInitialUtterance("Bought suya 3000 naira two days ago", ref);
    assert.equal(res.description, "Suya");
    assert.equal(res.amount, 3000);
    assert.equal(res.date, "2026-05-11");
    assert.equal(res.type, "EXPENSE");
  });

  it("detects income in multi-slot utterance", () => {
    const res = parseInitialUtterance("received 50k salary today", ref);
    assert.equal(res.description, "Salary");
    assert.equal(res.amount, 50000);
    assert.equal(res.date, "2026-05-13");
    assert.equal(res.type, "INCOME");
  });
});

describe("parseConfirmationIntent & parseDateStepAnswer & helpers", () => {
  const ref = new Date(2026, 4, 13, 12, 0, 0);

  it("parses confirmation intents", () => {
    assert.equal(parseConfirmationIntent("yes"), "yes");
    assert.equal(parseConfirmationIntent("Save it"), "yes");
    assert.equal(parseConfirmationIntent("okay"), "yes");
    assert.equal(parseConfirmationIntent("no"), "no");
    assert.equal(parseConfirmationIntent("cancel"), "no");
    assert.equal(parseConfirmationIntent("stop"), "no");
    assert.equal(parseConfirmationIntent("change the amount"), "change_amount");
    assert.equal(parseConfirmationIntent("change the date"), "change_date");
    assert.equal(parseConfirmationIntent("change description"), "change_description");
    assert.equal(parseConfirmationIntent("change the category"), "change_category");
  });

  it("parses date step responses", () => {
    assert.deepEqual(parseDateStepAnswer("yes", ref), {
      status: "resolved",
      date: "2026-05-13",
    });
    assert.deepEqual(parseDateStepAnswer("no, yesterday", ref), {
      status: "resolved",
      date: "2026-05-12",
    });
    assert.deepEqual(parseDateStepAnswer("no", ref), {
      status: "ask_which_day",
      date: null,
    });
  });

  it("matches spoken categories and formats friendly date labels", () => {
    assert.equal(matchSpokenCategory("put it under transport"), "Transport");
    assert.equal(matchSpokenCategory("bills please"), "Bills");
    assert.equal(matchSpokenCategory("something weird"), null);
    assert.equal(formatFriendlyDateLabel("2026-05-13", ref), "today");
    assert.equal(formatFriendlyDateLabel("2026-05-12", ref), "yesterday");
    assert.equal(formatFriendlyDateLabel("2026-05-10", ref), "2026-05-10");
  });
});
