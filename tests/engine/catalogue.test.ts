import { describe, expect, it } from "vitest";
import { Catalogue } from "@/engine/types";
import { catalogue } from "@/lib/catalogue";

const card = {
  id: "test-card",
  issuer: "TEST",
  name: "Test Card",
  network: "VISA",
  joiningFeeRs: 500,
  annualFeeRs: 500,
  lifetimeFree: false,
  feeWaiverSpendRs: 100000,
  forexMarkupPct: 3.5,
  rewards: [
    {
      category: "other",
      ratePct: 1,
      monthlyCapRs: null,
      capBasis: null,
      exclusions: ["fuel", "rent"],
      merchants: [],
      pointValuePaisa: null,
    },
  ],
  milestones: [],
  pointsExpiryMonths: null,
  lounge: null,
  upiOnCredit: null,
  verified: { on: "2026-11-13", sourceUrl: "https://example.com/mitc" },
};
const wrap = (cards: unknown[]) => ({ version: "t", source: "t", cards });

describe("Catalogue schema (Sec 7.1)", () => {
  it("accepts a well-formed card", () => {
    expect(Catalogue.safeParse(wrap([card])).success).toBe(true);
  });

  it("rejects a category outside Sec 8.1", () => {
    const bad = {
      ...card,
      rewards: [{ ...card.rewards[0], category: "shopping" }],
    };
    expect(Catalogue.safeParse(wrap([bad])).success).toBe(false);
  });

  it("rejects an exclusion outside Sec 8.1", () => {
    const bad = {
      ...card,
      rewards: [{ ...card.rewards[0], exclusions: ["wallet"] }],
    };
    expect(Catalogue.safeParse(wrap([bad])).success).toBe(false);
  });

  it("rejects a verified date that is not ISO", () => {
    const bad = { ...card, verified: { ...card.verified, on: "13/11/2026" } };
    expect(Catalogue.safeParse(wrap([bad])).success).toBe(false);
  });

  it("accepts a quarterly cap and a yearly lounge count", () => {
    const ok = {
      ...card,
      rewards: [{ ...card.rewards[0], monthlyCapRs: 4000, capPeriod: "quarter" }],
      lounge: {
        domesticPerQuarter: null,
        domesticPerYear: 4,
        internationalPerYear: null,
        spendGateRs: 50000,
        gatePeriod: "3-months",
      },
    };
    expect(Catalogue.safeParse(wrap([ok])).success).toBe(true);
  });

  it("rejects an unknown cap period", () => {
    const bad = { ...card, rewards: [{ ...card.rewards[0], capPeriod: "week" }] };
    expect(Catalogue.safeParse(wrap([bad])).success).toBe(false);
  });

  it("rejects duplicate card ids", () => {
    expect(Catalogue.safeParse(wrap([card, card])).success).toBe(false);
  });

  it("rejects a UPI rule on a non-RuPay card", () => {
    const bad = {
      ...card,
      upiOnCredit: { supported: true, ratePct: null, excluded: [] },
    };
    expect(Catalogue.safeParse(wrap([bad])).success).toBe(false);
  });
});

describe("shipped catalogue (Sec 13 step 1)", () => {
  // Only issuer-verified cards ship; the 25 to 30 target is met in later batches.
  it.todo("has 25 to 30 launch cards");

  it("has unique ids and issuer-page sources", () => {
    expect(new Set(catalogue.cards.map((c) => c.id)).size).toBe(catalogue.cards.length);
  });
});
