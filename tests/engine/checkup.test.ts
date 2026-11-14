import { describe, expect, it } from "vitest";
import { checkup } from "@/engine/checkup";
import { expiryReminders } from "@/engine/expiry";
import { TODAY, day, held, users } from "./fixtures";

describe("expiryReminders (Sec 10.5 tiers 60/30/7)", () => {
  it("values points expiring soon at the card's lowest stated point value", () => {
    // 14 Nov to 4 Dec = 20 days, so the 30-day tier. 3,000 points x 20 paise = Rs 600.
    const [r] = expiryReminders([users.expiringPoints[0]], TODAY);
    expect(r).toMatchObject({
      cardId: "hdfc-moneyback-plus",
      kind: "expiring",
      daysLeft: 20,
      tier: 30,
      valueRs: 600,
    });
  });

  it("uses the 7 and 60 day tiers", () => {
    // 14 Nov to 18 Nov = 4 days. 10,000 points x 15 paise = Rs 1,500.
    const [week] = expiryReminders(
      [
        held("hdfc-regalia-gold", {
          pointsBalance: 10000,
          pointsExpireOn: "2026-11-18",
        }),
      ],
      TODAY,
    );
    expect(week).toMatchObject({ tier: 7, valueRs: 1500 });
    // 14 Nov to 29 Dec = 45 days.
    const [far] = expiryReminders(
      [
        held("hdfc-millennia", {
          pointsBalance: 100,
          pointsExpireOn: "2026-12-29",
        }),
      ],
      TODAY,
    );
    expect(far).toMatchObject({ tier: 60, daysLeft: 45, valueRs: 100 });
  });

  it("says nothing for points over 60 days out, already expired, or that never expire", () => {
    const quiet = [
      held("hdfc-moneyback-plus", {
        pointsBalance: 3000,
        pointsExpireOn: "2027-03-01",
      }),
      held("hdfc-millennia", {
        pointsBalance: 3000,
        pointsExpireOn: "2026-11-01",
      }),
      held("sbi-cashback", { pointsBalance: 100 }),
    ];
    expect(expiryReminders(quiet, TODAY)).toEqual([]);
  });

  it("flags unknown expiry instead of treating it as safe", () => {
    // Tata Neu expiry is null in the catalogue (unknown); Millennia expires in 24 months but no date was entered.
    const out = expiryReminders(
      [users.expiringPoints[1], held("hdfc-millennia", { pointsBalance: 800 })],
      TODAY,
    );
    expect(out.map((r) => [r.cardId, r.kind, r.valueRs])).toEqual([
      ["hdfc-tata-neu-infinity", "unknown", null],
      ["hdfc-millennia", "unknown", null],
    ]);
  });
});

describe("checkup", () => {
  const cards = [
    held("hdfc-moneyback-plus", {
      pointsBalance: 3000,
      pointsExpireOn: "2026-12-04",
      quarterSpendRs: 20000,
    }),
    held("hdfc-millennia", {
      anniversaryMonth: 3,
      openedOn: "2024-03-10",
      ytdSpendRs: 60000,
    }),
  ];

  it("adds expiring points and fees at risk", () => {
    // Rs 600 of MoneyBack+ points expire in 20 days; Millennia waiver is behind, so its Rs 1,000 fee is at risk.
    // The MoneyBack+ milestone is behind but has 48 days left (30 or more), so it is not counted yet.
    const out = checkup(cards, TODAY);
    expect(out.atRiskRs).toBe(1600);
    expect(out.top3.map((i) => [i.cardId, i.kind, i.rupees])).toEqual([
      ["hdfc-millennia", "fee", 1000],
      ["hdfc-moneyback-plus", "points-expiry", 600],
    ]);
  });

  it("counts a milestone behind pace with under 30 days left", () => {
    // On 10 Dec: points already expired (not counted). Quarter has 22 days left; Rs 20,000 x 92 = 18,40,000
    // < Rs 50,000 x 70 = 35,00,000, so the Rs 500 voucher is at risk. Millennia: 275 days in,
    // Rs 60,000 x 365 = 2,19,00,000 < Rs 1,00,000 x 275, so Rs 1,000 at risk. Total Rs 1,500.
    const out = checkup(cards, day("2026-12-10"));
    expect(out.atRiskRs).toBe(1500);
    expect(out.items.map((i) => i.kind).sort()).toEqual(["fee", "milestone"]);
  });

  it("is zero for a card with nothing entered", () => {
    expect(checkup([held("icici-amazon-pay")], TODAY)).toEqual({
      atRiskRs: 0,
      items: [],
      top3: [],
    });
  });
});
