import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { impactOfChange } from "@/engine/impact";
import { verdict } from "@/engine/verdict";
import { TODAY, held } from "./fixtures";

const all = catalogue.cards;

describe("verdict (Sec 8.4)", () => {
  it("keeps a card that pays for itself", () => {
    // Millennia, no merchant given: all Rs 20,000 a month falls to 1% on other spends = Rs 200 a month
    // (under the Rs 1,000 cap) = Rs 2,400 a year. Rs 2,40,000 a year clears the Rs 1,00,000 waiver: fee Rs 0.
    const m = held("hdfc-millennia");
    const v = verdict(
      m,
      [m],
      all,
      { "online-shopping": 10000, groceries: 5000, dining: 5000 },
      TODAY,
    );
    expect(v).toMatchObject({ decision: "keep", netValueRs: 2400 });
  });

  it("counts a milestone the spend profile reaches", () => {
    // MoneyBack+ 0.2% on Rs 20,000 = Rs 40 a month = Rs 480. Rs 60,000 a quarter hits the Rs 50,000
    // milestone: Rs 500 x 4 = Rs 2,000. Waiver met. Net Rs 2,480.
    const mb = held("hdfc-moneyback-plus");
    expect(verdict(mb, [mb], all, { other: 20000 }, TODAY).netValueRs).toBe(
      2480,
    );
  });

  it("suggests a downgrade when the fee outweighs the rewards and a cheaper same-issuer card exists", () => {
    // Regalia Gold groceries 0.375% of Rs 10,000 = Rs 37.5, floored to Rs 37 a month = Rs 444 a year.
    // Rs 1,20,000 a year misses the Rs 4,00,000 waiver: fee Rs 2,500. Net Rs 444 - Rs 2,500 = -Rs 2,056.
    const rg = held("hdfc-regalia-gold");
    const v = verdict(rg, [rg], all, { groceries: 10000 }, TODAY);
    expect(v).toMatchObject({ decision: "downgrade", netValueRs: -2056 });
    expect(v.caveats.join(" ")).toMatch(/lounge.*not counted/i);
  });

  it("counts lounge value only when the user enters visits and a value, and the spend gate is met", () => {
    // Regalia other 0.375% of Rs 25,000 = Rs 93.75 -> Rs 93 a month = Rs 1,116. Rs 75,000 a quarter meets the
    // Rs 60,000 gate; 4 visits x Rs 1,000 = Rs 4,000. Rs 3,00,000 misses the waiver: fee Rs 2,500.
    // Net Rs 1,116 + Rs 4,000 - Rs 2,500 = Rs 2,616.
    const rg = held("hdfc-regalia-gold", {
      loungeVisitsPerYear: 4,
      loungeValueRs: 1000,
    });
    expect(verdict(rg, [rg], all, { other: 25000 }, TODAY)).toMatchObject({
      decision: "keep",
      netValueRs: 2616,
    });
  });

  it("does not count spend the card excludes towards milestones or the waiver", () => {
    // Regalia Gold, Rs 50,000 a month of rent: excluded, so Rs 0 rewards, no milestone, and the Rs 4,00,000
    // waiver is not met by rent. Net -Rs 2,500.
    const rg = held("hdfc-regalia-gold");
    expect(verdict(rg, [rg], all, { rent: 50000 }, TODAY).netValueRs).toBe(
      -2500,
    );
  });

  it("does not keep a card that only pays this year because the waiver is on pace", () => {
    // Millennia waiver on pace this year (Rs 70,000 of Rs 1,00,000), so this year's fee is Rs 0.
    // Profile Rs 2,000 a month of dining = Rs 20 a month = Rs 240; Rs 24,000 a year will not waive next year's
    // Rs 1,000 fee: next year nets -Rs 760. Cheaper HDFC cards exist, so downgrade.
    const m = held("hdfc-millennia", {
      anniversaryMonth: 3,
      openedOn: "2024-03-10",
      ytdSpendRs: 70000,
    });
    const v = verdict(m, [m], all, { dining: 2000 }, TODAY);
    expect(v).toMatchObject({ decision: "downgrade", netValueRs: 240 });
    expect(v.reasons.join(" ")).toMatch(/next year/i);
  });

  describe("close vs keep for a losing card with no cheaper variant", () => {
    // SBI Cashback 1% of Rs 2,000 = Rs 20 a month = Rs 240. Rs 24,000 misses the Rs 2,00,000 waiver:
    // fee Rs 999. Net -Rs 759. No other SBI card is in the catalogue.
    const profile = { dining: 2000 };

    it("closes it when another card is older", () => {
      const sbi = held("sbi-cashback", { openedOn: "2025-01-01" });
      const v = verdict(
        sbi,
        [sbi, held("hdfc-millennia", { openedOn: "2020-01-01" })],
        all,
        profile,
        TODAY,
      );
      expect(v).toMatchObject({ decision: "close", netValueRs: -759 });
    });

    it("keeps it when it is the oldest card, and says why", () => {
      const sbi = held("sbi-cashback", { openedOn: "2019-01-01" });
      const v = verdict(
        sbi,
        [sbi, held("hdfc-millennia", { openedOn: "2020-01-01" })],
        all,
        profile,
        TODAY,
      );
      expect(v.decision).toBe("keep");
      expect(v.caveats.join(" ")).toMatch(/oldest/i);
    });

    it("keeps it when an opening date is missing, since it may be the oldest", () => {
      const sbi = held("sbi-cashback", { openedOn: "2025-01-01" });
      const v = verdict(
        sbi,
        [sbi, held("hdfc-millennia")],
        all,
        profile,
        TODAY,
      );
      expect(v.decision).toBe("keep");
    });
  });
});

describe("impactOfChange", () => {
  const m = held("hdfc-millennia");
  const profile = { dining: 5000 };

  it("prices a rate cut on the user's own spend", () => {
    // Dining falls to 1% on other spends: Rs 50 a month. At 0.5%: Rs 25. Difference -Rs 25 x 12 = -Rs 300.
    expect(
      impactOfChange(
        m,
        { kind: "rate", category: "dining", beforePct: 1, afterPct: 0.5 },
        profile,
      ).rupeesPerYear,
    ).toBe(-300);
  });

  it("prices a fee rise", () => {
    expect(
      impactOfChange(m, { kind: "fee", beforeRs: 1000, afterRs: 1500 }, profile)
        .rupeesPerYear,
    ).toBe(-500);
  });

  it("prices a fee change at zero when the user will not pay the fee", () => {
    // Rs 20,000 a month of dining = Rs 2,40,000 a year, above Millennia's Rs 1,00,000 waiver.
    expect(
      impactOfChange(
        m,
        { kind: "fee", beforeRs: 1000, afterRs: 1500 },
        { dining: 20000 },
      ).rupeesPerYear,
    ).toBe(0);
    expect(
      impactOfChange(
        held("icici-amazon-pay"),
        { kind: "fee", beforeRs: 0, afterRs: 500 },
        profile,
      ).rupeesPerYear,
    ).toBe(0);
  });

  it("returns null when it cannot price the change", () => {
    expect(
      impactOfChange(
        m,
        { kind: "other", description: "Lounge list changed" },
        profile,
      ).rupeesPerYear,
    ).toBeNull();
  });
});
