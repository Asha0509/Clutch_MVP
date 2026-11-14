import { describe, expect, it } from "vitest";
import { bestCard } from "@/engine/bestCard";
import type { Spend } from "@/engine/types";
import { TODAY, day, held, users } from "./fixtures";

const spend = (
  s: Partial<Spend> & Pick<Spend, "category" | "amountRs">,
): Spend => ({
  channel: "card",
  ...s,
});

describe("bestCard (Sec 8.3)", () => {
  it("applies the cap left this period", () => {
    // Millennia 5% at Amazon on Rs 4,000 = Rs 200, but only Rs 1,000 - Rs 900 = Rs 100 of cap is left.
    const [top] = bestCard(
      users.cappedCategory,
      spend({
        category: "online-shopping",
        amountRs: 4000,
        merchant: "Amazon",
      }),
      TODAY,
    );
    expect(top.rewardRs).toBe(100);
    expect(top.caveats.join(" ")).toMatch(/cap/i);
  });

  it("gives nothing on an excluded category and breaks the tie on fee", () => {
    // Rent is excluded on both cards: Rs 0 each. Amazon Pay (fee Rs 0) ranks above SBI Cashback (Rs 999).
    const ranked = bestCard(
      users.excludedCategory,
      spend({ category: "rent", amountRs: 20000 }),
      TODAY,
    );
    expect(ranked.map((r) => [r.cardId, r.rewardRs])).toEqual([
      ["icici-amazon-pay", 0],
      ["sbi-cashback", 0],
    ]);
    expect(ranked[1].caveats.join(" ")).toMatch(/rent/i);
  });

  it("only lets RuPay cards with UPI on credit take a UPI payment", () => {
    // Tata Neu Infinity UPI rate 0.5%: Rs 2,000 x 0.5% = Rs 10. Millennia is Visa, so not eligible.
    const ranked = bestCard(
      users.upiOnly,
      spend({ category: "groceries", amountRs: 2000, channel: "upi" }),
      TODAY,
    );
    expect(ranked.map((r) => [r.cardId, r.eligible, r.rewardRs])).toEqual([
      ["hdfc-tata-neu-infinity", true, 10],
      ["hdfc-millennia", false, 0],
    ]);
  });

  it("refuses UPI on a category the UPI rule excludes", () => {
    const [neu] = bestCard(
      [held("hdfc-tata-neu-infinity")],
      spend({ category: "fuel", amountRs: 1000, channel: "upi" }),
      TODAY,
    );
    expect(neu.eligible).toBe(false);
  });

  it("shows a milestone bonus as a separate line, not in the reward", () => {
    // Regalia Gold base 0.375%: Rs 10,000 x 0.375% = Rs 37.5, floored to Rs 37.
    // Quarter spend Rs 1,45,000 + Rs 10,000 crosses the Rs 1,50,000 milestone (Rs 1,500 voucher).
    const [top] = bestCard(
      users.nearMilestone,
      spend({ category: "dining", amountRs: 10000 }),
      TODAY,
    );
    expect(top.rewardRs).toBe(37);
    expect(top.bonus).toMatchObject({ benefitValueRs: 1500 });
  });

  it("breaks a reward tie on the lower annual fee", () => {
    // Both earn 1% on entertainment: Rs 1,000 -> Rs 10. Tata Neu Plus fee Rs 499 < Flipkart Axis Rs 500.
    const ranked = bestCard(
      users.tieBreak,
      spend({ category: "entertainment", amountRs: 1000 }),
      TODAY,
    );
    expect(ranked.map((r) => [r.cardId, r.rewardRs])).toEqual([
      ["hdfc-tata-neu-plus", 10],
      ["axis-flipkart", 10],
    ]);
  });

  it("breaks an equal-fee tie on card id", () => {
    // Rs 10 on entertainment: MoneyBack+ 0.2% -> Rs 0.02, Flipkart 1% -> Rs 0.10; both floor to Rs 0.
    // Both fees are Rs 500, so "axis-flipkart" sorts before "hdfc-moneyback-plus".
    const ranked = bestCard(
      [held("hdfc-moneyback-plus"), held("axis-flipkart")],
      spend({ category: "entertainment", amountRs: 10 }),
      TODAY,
    );
    expect(ranked.map((r) => r.cardId)).toEqual([
      "axis-flipkart",
      "hdfc-moneyback-plus",
    ]);
  });

  it("does not rank merchant-only rates without a merchant, but mentions them", () => {
    // No merchant: Millennia falls back to 1% on other spends: Rs 2,000 -> Rs 20.
    const [top] = bestCard(
      [held("hdfc-millennia")],
      spend({ category: "online-shopping", amountRs: 2000 }),
      TODAY,
    );
    expect(top.rewardRs).toBe(20);
    expect(top.caveats.join(" ")).toMatch(/5% at Amazon/);
  });

  it("applies a quarterly cap", () => {
    // Flipkart Axis 7.5% at Myntra: Rs 60,000 -> Rs 4,500, capped to Rs 4,000 - Rs 3,800 = Rs 200.
    const [top] = bestCard(
      users.quarterlyCap,
      spend({
        category: "online-shopping",
        amountRs: 60000,
        merchant: "Myntra",
      }),
      TODAY,
    );
    expect(top.rewardRs).toBe(200);
  });

  it("uses a merchant rule even when the base rule excludes the category", () => {
    // ACE 5% on utility bills via Google Pay: Rs 3,000 -> Rs 150. Off Google Pay, utilities earn nothing.
    const ace = [held("axis-ace")];
    expect(
      bestCard(
        ace,
        spend({
          category: "utilities",
          amountRs: 3000,
          merchant: "Google Pay",
        }),
        TODAY,
      )[0].rewardRs,
    ).toBe(150);
    expect(
      bestCard(ace, spend({ category: "utilities", amountRs: 3000 }), TODAY)[0]
        .rewardRs,
    ).toBe(0);
  });

  it("notes the repay window from the statement and due days", () => {
    // Today is the 14th. Statement on the 12th is 2 days ago, so a new purchase gets about 50 days.
    const fresh = bestCard(
      [held("hdfc-millennia", { statementDay: 12, dueDay: 2 })],
      spend({ category: "other", amountRs: 100 }),
      TODAY,
    );
    expect(fresh[0].timing).toBe("About 50 days to repay.");
    // Statement on the 5th, due on the 25th: 25 - 14 = 11 days to the due date.
    const later = bestCard(
      [held("hdfc-millennia", { statementDay: 5, dueDay: 25 })],
      spend({ category: "other", amountRs: 100 }),
      TODAY,
    );
    expect(later[0].timing).toBe("11 days to the due date.");
  });

  it("reads cap usage under the rule that applies, including the general rule", () => {
    // Millennia groceries fall to 1% on other spends, capped at Rs 1,000 a month. All of it is used: Rs 0.
    const [top] = bestCard(
      [held("hdfc-millennia", { capUsedRs: { other: 1000 } })],
      spend({ category: "groceries", amountRs: 5000 }),
      TODAY,
    );
    expect(top.rewardRs).toBe(0);
  });

  it("counts a month-end statement day that falls on a shorter month", () => {
    // Statement day 31; November has 30 days, so the statement fell on 30 Nov. 1 Dec is 1 day later.
    const [top] = bestCard(
      [held("hdfc-millennia", { statementDay: 31, dueDay: 20 })],
      spend({ category: "other", amountRs: 100 }),
      day("2026-12-01"),
    );
    expect(top.timing).toBe("About 50 days to repay.");
  });

  it("warns that small-ticket UPI exclusions are not checked", () => {
    const [neu] = bestCard(
      users.upiOnly,
      spend({ category: "groceries", amountRs: 50, channel: "upi" }),
      TODAY,
    );
    expect(neu.caveats.join(" ")).toMatch(/small UPI/i);
  });

  it("always gives a plain reason", () => {
    const [top] = bestCard(
      [held("sbi-cashback")],
      spend({ category: "dining", amountRs: 1000 }),
      TODAY,
    );
    // SBI Cashback 1% on other spends: Rs 1,000 -> Rs 10.
    expect(top.rewardRs).toBe(10);
    expect(top.reason).toBe("Rs 10 back on Rs 1,000 at 1%.");
  });
});
