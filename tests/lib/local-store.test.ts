import { describe, expect, it } from "vitest";
import { demoUser } from "@/lib/demo";
import {
  approve,
  exampleState,
  parseState,
  removeCardFrom,
} from "@/lib/local-store";

const today = new Date("2026-11-14T00:00:00Z");

describe("parseState (browser storage is untrusted input)", () => {
  it("reads missing or corrupt storage as empty", () => {
    const empty = {
      adult: false,
      cards: [],
      profiles: {},
      alerts: [],
      decided: [],
    };
    expect(parseState(null)).toEqual(empty);
    expect(parseState("{not json")).toEqual(empty);
    expect(parseState('"a string"')).toEqual(empty);
  });

  it("keeps good cards and drops bad ones, including full card numbers", () => {
    const raw = JSON.stringify({
      adult: true,
      cards: [
        { cardId: "hdfc-millennia", last4: "4821" },
        { cardId: "axis-ace", last4: "4111111111111111" },
        "junk",
      ],
    });
    expect(parseState(raw).cards).toEqual([
      { cardId: "hdfc-millennia", last4: "4821" },
    ]);
  });
});

describe("the example person", () => {
  it("holds the demo cards and their monthly spend, with no alerts yet", () => {
    const s = exampleState(today);
    const demo = demoUser(today);
    expect(s.cards.map((c) => c.cardId)).toEqual(
      demo.held.map((h) => h.cardId),
    );
    expect(s.profiles).toEqual(demo.profiles);
    expect(s.alerts).toEqual([]);
  });
});

describe("approve (PRD Sec 10: nothing reaches the user until approved)", () => {
  const pending = {
    id: "hdfc-moneyback-plus-2026-05-15-x",
    cardId: "hdfc-moneyback-plus",
    title: "Earn rate cut ~25%: per ₹150 raised to per ₹200",
    before: "2 per ₹150 (base)",
    after: "2 per ₹200 (base)",
  };

  it("prices the change on the holder's own monthly spend", () => {
    // Online spend Rs 15,000 a month. 0.267% -> 0.2% is 0.067% of Rs 1,80,000 a year = Rs 120.60,
    // floored: Rs 120 a year lost (same figure as tests/lib/demo.test.ts).
    const s = approve(exampleState(today), pending, {
      issuerUrl: "https://www.hdfc.bank.in/notice.pdf",
      change: {
        kind: "rate",
        category: "online-shopping",
        beforePct: 0.267,
        afterPct: 0.2,
      },
    });
    expect(s.alerts).toHaveLength(1);
    expect(s.alerts[0]).toMatchObject({
      alertId: pending.id,
      cardId: "hdfc-moneyback-plus",
      rupeesPerYear: -120,
      issuerUrl: "https://www.hdfc.bank.in/notice.pdf",
    });
    expect(s.decided).toEqual([pending.id]);
  });

  it("does not alert someone who does not hold the card, but marks it decided", () => {
    const s = approve(
      exampleState(today),
      { ...pending, cardId: "axis-ace" },
      {
        issuerUrl: "https://example.org",
        change: { kind: "other", description: "x" },
      },
    );
    expect(s.alerts).toEqual([]);
    expect(s.decided).toEqual([pending.id]);
  });

  it("is idempotent: approving twice sends one alert", () => {
    const input = {
      issuerUrl: "https://example.org",
      change: { kind: "other" as const, description: "x" },
    };
    const once = approve(exampleState(today), pending, input);
    expect(approve(once, pending, input).alerts).toHaveLength(1);
  });
});

describe("removeCardFrom", () => {
  it("drops the card with its spend and its alerts", () => {
    const s = removeCardFrom(exampleState(today), "hdfc-moneyback-plus");
    expect(s.cards.map((c) => c.cardId)).not.toContain("hdfc-moneyback-plus");
    expect(s.profiles["hdfc-moneyback-plus"]).toBeUndefined();
  });
});
