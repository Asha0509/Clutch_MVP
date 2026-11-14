import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alertsFromFeed } from "@/lib/feed";

const feed = JSON.parse(readFileSync("data/fixtures/feed-sample.json", "utf8"));
const shipped = new Set(["hdfc-millennia", "hdfc-regalia-gold", "sbi-cashback", "axis-ace", "icici-amazon-pay"]);

describe("alertsFromFeed (PRD Sec 10.1)", () => {
  const out = alertsFromFeed(feed, shipped);

  it("keeps well-formed entries on catalogue cards only", () => {
    // 8 entries: 5 on our cards, 2 on other cards, 1 malformed (no date or type).
    expect(out.map((a) => a.alert.cardId).sort()).toEqual([...shipped].sort());
  });

  it("writes every alert as pending, never approved", () => {
    expect(out.every((a) => a.alert.status === "pending")).toBe(true);
  });

  it("uses the notice id when there is one, and a stable id otherwise", () => {
    const millennia = out.find((a) => a.alert.cardId === "hdfc-millennia");
    expect(millennia?.id).toBe("hdfc-millennia-hdfc-2025-2026-surcharges-and-dcc");
    expect(alertsFromFeed(feed, shipped).map((a) => a.id)).toEqual(out.map((a) => a.id));
    expect(new Set(out.map((a) => a.id)).size).toBe(out.length);
    expect(out.every((a) => /^[a-z0-9-]+$/.test(a.id))).toBe(true);
  });

  it("carries the feed's words and source, not a price", () => {
    const ace = out.find((a) => a.alert.cardId === "axis-ace")?.alert;
    expect(ace).toMatchObject({ changeType: "fee", feedTier: "official" });
    expect(ace?.title).toMatch(/currency conversion/i);
    expect(ace).not.toHaveProperty("rupeesPerYear");
  });

  it("returns nothing for a feed that is not the expected shape", () => {
    expect(alertsFromFeed({ nope: true }, shipped)).toEqual([]);
  });
});
