import { describe, expect, it } from "vitest";
import { checkup } from "@/engine/checkup";
import { expiryReminders } from "@/engine/expiry";
import { impactOfChange } from "@/engine/impact";
import { waiverProgress } from "@/engine/progress";
import { verdict } from "@/engine/verdict";
import { catalogue } from "@/lib/catalogue";
import { demoUser } from "@/lib/demo";

// PRD Sec 3.3: a synthetic user, three real cards, a timeline relative to today so it never goes stale.
for (const iso of ["2026-11-14", "2027-03-01", "2028-02-20"]) {
  const today = new Date(`${iso}T00:00:00Z`);
  const demo = demoUser(today);
  const card = (id: string) => {
    const h = demo.held.find((c) => c.cardId === id);
    if (!h) throw new Error(id);
    return h;
  };

  describe(`demo user on ${iso}`, () => {
    it("holds MoneyBack+, Millennia and Tata Neu Infinity", () => {
      expect(demo.held.map((h) => h.cardId)).toEqual([
        "hdfc-moneyback-plus",
        "hdfc-millennia",
        "hdfc-tata-neu-infinity",
      ]);
    });

    it("has 3,000 MoneyBack+ points expiring in 28 days", () => {
      // 3,000 points x 20 paise (HDFC's lowest stated value) = Rs 600.
      const [r] = expiryReminders(demo.held, today);
      expect(r).toMatchObject({
        cardId: "hdfc-moneyback-plus",
        daysLeft: 28,
        valueRs: 600,
      });
    });

    it("has the Millennia waiver at 62% with 100 days left, behind pace", () => {
      // Rs 62,000 of Rs 1,00,000. About 265 of 365 days gone: 62,000 x 365 = 2,26,30,000
      // < 1,00,000 x 265 = 2,65,00,000, so behind. Rs 38,000 to go.
      expect(waiverProgress(card("hdfc-millennia"), today)).toEqual({
        spentRs: 62000,
        targetRs: 100000,
        remainingRs: 38000,
        daysLeft: 100,
        onTrack: false,
      });
    });

    it("puts Rs 1,600 at risk on the checkup", () => {
      // Rs 600 of points expiring + the Rs 1,000 Millennia fee with the waiver behind pace.
      expect(checkup(demo.held, today).atRiskRs).toBe(1600);
    });

    it("prices the real MoneyBack+ earn-rate cut at -Rs 120 a year on everyday spend", () => {
      // 2 CashPoints per Rs 150 at 20 paise = 0.267%; per Rs 200 = 0.2%. Rs 15,000 a month of online
      // shopping earns the base rate: floor(40.05) = Rs 40 before, Rs 30 after. -Rs 10 x 12 = -Rs 120.
      const [alert] = demo.alerts;
      expect(alert.cardId).toBe("hdfc-moneyback-plus");
      expect(alert.rupeesPerYear).toBe(-120);
      expect(
        impactOfChange(
          card("hdfc-moneyback-plus"),
          demo.change,
          demo.profiles["hdfc-moneyback-plus"],
        ).rupeesPerYear,
      ).toBe(-120);
    });

    it("gives keep, downgrade and keep verdicts from each card's own spend", () => {
      const v = (id: string) =>
        verdict(card(id), demo.held, catalogue.cards, demo.profiles[id], today);
      // MoneyBack+: Rs 20,000 a month at 0.2% = Rs 40 a month = Rs 480. Rs 60,000 a quarter hits the
      // Rs 50,000 milestone: Rs 500 x 4 = Rs 2,000. Waiver met. Net Rs 2,480.
      expect(v("hdfc-moneyback-plus")).toMatchObject({
        decision: "keep",
        netValueRs: 2480,
      });
      // Millennia: Rs 8,000 a month at 1% = Rs 80 a month = Rs 960. Waiver behind this year and Rs 96,000 a
      // year misses it next year: fee Rs 1,000. Net -Rs 40; cheaper HDFC cards exist.
      expect(v("hdfc-millennia")).toMatchObject({
        decision: "downgrade",
        netValueRs: -40,
      });
      // Tata Neu Infinity: groceries Rs 150 + utilities Rs 45 + other Rs 90 = Rs 285 a month = Rs 3,420.
      // Rs 2,28,000 a year misses the Rs 3,00,000 waiver: fee Rs 1,499. Net Rs 1,921.
      expect(v("hdfc-tata-neu-infinity")).toMatchObject({
        decision: "keep",
        netValueRs: 1921,
      });
    });
  });
}
