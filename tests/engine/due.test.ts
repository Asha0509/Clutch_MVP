import { describe, expect, it } from "vitest";
import { dueDates } from "@/engine/due";
import { TODAY, held } from "./fixtures";

// PRD F10: next statement and payment due dates, reminders 5, 2 and 0 days before. TODAY is 14 Nov 2026.
describe("dueDates", () => {
  it.each([
    // dueDay, expected date, days left, reminder tier
    [20, "2026-11-20", 6, null], // 14 -> 20 Nov is 6 days: outside the 5-day reminder
    [19, "2026-11-19", 5, 5],
    [16, "2026-11-16", 2, 2],
    [14, "2026-11-14", 0, 0], // due today
    [7, "2026-12-07", 23, null], // 7 Nov has passed, so 7 Dec: 16 days left in Nov + 7 = 23
  ])("due day %i -> %s, %i days, tier %s", (dueDay, on, daysLeft, tier) => {
    const [d] = dueDates([held("hdfc-millennia", { dueDay })], TODAY);
    expect(d).toMatchObject({ kind: "due", on, daysLeft, tier });
  });

  it("clamps day 31 to the end of a short month", () => {
    // 27 Feb 2027 -> 28 Feb 2027 (not a leap year): 1 day, inside the 2-day reminder.
    const [d] = dueDates(
      [held("hdfc-millennia", { dueDay: 31 })],
      new Date("2027-02-27T00:00:00Z"),
    );
    expect(d).toMatchObject({ on: "2027-02-28", daysLeft: 1, tier: 2 });
  });

  it("lists the statement date too, and says it plainly", () => {
    // Statement 18 Nov is 4 days away; due 7 Dec is 23 days away.
    const out = dueDates(
      [held("hdfc-millennia", { statementDay: 18, dueDay: 7 })],
      TODAY,
    );
    expect(out.map((d) => d.text)).toEqual([
      "Statement on 18 Nov, in 4 days.",
      "Payment due on 7 Dec, in 23 days.",
    ]);
    const [today] = dueDates([held("hdfc-millennia", { dueDay: 14 })], TODAY);
    expect(today.text).toBe("Payment due today, 14 Nov.");
  });

  it("says nothing when the days are not entered", () => {
    expect(dueDates([held("hdfc-millennia", {})], TODAY)).toEqual([]);
  });
});
