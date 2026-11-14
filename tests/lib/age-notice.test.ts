import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAdult, todayUtc } from "@/lib/age";
import { ALL_PURPOSES, ASKED_AT_SIGNUP } from "@/lib/notice";

const nov2026 = new Date(Date.UTC(2026, 10, 14));

describe("isAdult (PRD Sec 6.1, same rule as firestore.rules)", () => {
  it.each([
    [2000, 6, true], // 26
    [2008, 10, true], // turned 18 in October
    [2008, 11, false], // 18th birthday month is this month: counted as under 18
    [2008, 12, false], // turns 18 next month
    [2010, 1, false], // 16
  ])("born %i-%i -> %s", (year, month, expected) => {
    expect(isAdult(year, month, nov2026)).toBe(expected);
  });
});

describe("todayUtc", () => {
  it("keeps the local calendar date", () => {
    const lateEvening = new Date(2026, 10, 14, 23, 30);
    expect(todayUtc(lateEvening).toISOString()).toBe(
      "2026-11-14T00:00:00.000Z",
    );
  });
});

describe("consent purposes", () => {
  it("match the purpose list firestore.rules accepts", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const listed = rules.match(/data\(\)\.purpose in \[([^\]]+)\]/)?.[1] ?? "";
    expect(listed.match(/'([a-z_]+)'/g)?.map((s) => s.slice(1, -1))).toEqual([
      ...ALL_PURPOSES,
    ]);
  });
  it("ask core as required and leave every other purpose off by default", () => {
    expect(ASKED_AT_SIGNUP.filter((p) => p.required).map((p) => p.id)).toEqual([
      "core",
    ]);
    expect(ASKED_AT_SIGNUP.map((p) => p.id)).toContain("marketing");
  });
});
