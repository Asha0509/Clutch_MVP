import { describe, expect, it } from "vitest";
import { milestoneProgress, waiverProgress } from "@/engine/progress";
import { TODAY, held, users } from "./fixtures";

// Card year 10 Mar 2026 to 10 Mar 2027 (365 days). 10 Mar to 14 Nov 2026 = 249 days elapsed;
// 14 Nov 2026 to 10 Mar 2027 = 116 days left.
describe("waiverProgress", () => {
  it("is on track when spend is ahead of a straight-line pace", () => {
    // Rs 70,000 x 365 = 2,55,50,000 >= Rs 1,00,000 x 249 = 2,49,00,000.
    expect(waiverProgress(users.waiverOnTrack[0], TODAY)).toEqual({
      spentRs: 70000,
      targetRs: 100000,
      remainingRs: 30000,
      daysLeft: 116,
      onTrack: true,
    });
  });

  it("is behind when spend is under pace", () => {
    // Rs 60,000 x 365 = 2,19,00,000 < 2,49,00,000.
    expect(waiverProgress(users.waiverBehind[0], TODAY)?.onTrack).toBe(false);
  });

  it("is unknown, not zero, when spend was not entered", () => {
    const p = waiverProgress(
      held("hdfc-millennia", { anniversaryMonth: 3, openedOn: "2024-03-10" }),
      TODAY,
    );
    expect(p).toEqual({
      spentRs: null,
      targetRs: 100000,
      remainingRs: null,
      daysLeft: 116,
      onTrack: null,
    });
  });

  it("does not apply to a lifetime-free card", () => {
    expect(waiverProgress(users.lifetimeFree[0], TODAY)).toBeNull();
  });
});

// Calendar quarter Oct to Dec 2026: 92 days. 1 Oct to 14 Nov = 44 days elapsed; to 1 Jan = 48 days left.
describe("milestoneProgress", () => {
  const regalia = held("hdfc-regalia-gold", {
    anniversaryMonth: 3,
    openedOn: "2024-03-10",
    quarterSpendRs: 145000,
    ytdSpendRs: 300000,
  });

  it("tracks each milestone on its own period", () => {
    const [quarter, year] = milestoneProgress(regalia, TODAY);
    // Rs 1,45,000 x 92 = 1,33,40,000 >= Rs 1,50,000 x 44 = 66,00,000: on track, Rs 5,000 to go.
    expect(quarter).toMatchObject({
      targetRs: 150000,
      spentRs: 145000,
      remainingRs: 5000,
      daysLeft: 48,
      status: "on-track",
    });
    // Rs 3,00,000 x 365 = 10,95,00,000 < Rs 7,50,000 x 249 = 18,67,50,000: behind.
    expect(year).toMatchObject({
      targetRs: 750000,
      remainingRs: 450000,
      daysLeft: 116,
      status: "behind",
    });
  });

  it("marks a reached milestone as done", () => {
    const [quarter] = milestoneProgress(
      { ...regalia, quarterSpendRs: 160000 },
      TODAY,
    );
    expect(quarter).toMatchObject({ status: "done", remainingRs: 0 });
  });

  it("is behind when quarter spend is under pace", () => {
    // MoneyBack+ Rs 50,000 a quarter: Rs 20,000 x 92 = 18,40,000 < Rs 50,000 x 44 = 22,00,000.
    const [q] = milestoneProgress(
      held("hdfc-moneyback-plus", { quarterSpendRs: 20000 }),
      TODAY,
    );
    expect(q.status).toBe("behind");
  });

  it("does not use card-year spend for a calendar-year milestone", () => {
    const h = held("hdfc-millennia", { ytdSpendRs: 200000 });
    const yearly = {
      ...h,
      card: {
        ...h.card,
        milestones: [
          {
            period: "year" as const,
            spendRs: 150000,
            benefit: "Test",
            benefitValueRs: 100,
          },
        ],
      },
    };
    expect(milestoneProgress(yearly, TODAY)[0].status).toBe("unknown");
  });

  it("says unknown when the period's spend was not entered", () => {
    const [q] = milestoneProgress(held("hdfc-millennia"), TODAY);
    expect(q).toMatchObject({
      status: "unknown",
      spentRs: null,
      remainingRs: null,
    });
  });
});
