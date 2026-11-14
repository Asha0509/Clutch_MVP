import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { bestCard } from "@/engine/bestCard";
import { Category, type HeldCard, type Spend } from "@/engine/types";
import { TODAY, allShipped } from "./fixtures";

const amounts = [0, 1, 99, 1000, 123457];
const channels: Spend["channel"][] = ["card", "upi"];
const merchants = [undefined, "Amazon", "Myntra", "Google Pay"];

describe("engine properties (Sec 8.5)", () => {
  it("never returns a negative or fractional reward", () => {
    const held = allShipped().map((h) => ({
      ...h,
      capUsedRs: { "online-shopping": 999999 },
    }));
    for (const category of Category.options)
      for (const amountRs of amounts)
        for (const channel of channels)
          for (const merchant of merchants)
            for (const cards of [allShipped(), held])
              for (const r of bestCard(
                cards,
                { category, amountRs, channel, merchant },
                TODAY,
              )) {
                expect(r.rewardRs).toBeGreaterThanOrEqual(0);
                expect(Number.isInteger(r.rewardRs)).toBe(true);
              }
  });

  it("ranks the same whatever order the cards are given in", () => {
    const base = allShipped();
    const orders: HeldCard[][] = [
      base,
      [...base].reverse(),
      [...base.slice(3), ...base.slice(0, 3)],
      base
        .filter((_, i) => i % 2 === 0)
        .concat(base.filter((_, i) => i % 2 === 1)),
      [...base].sort((a, b) => b.cardId.localeCompare(a.cardId)),
    ];
    for (const category of Category.options)
      for (const channel of channels) {
        const spend: Spend = { category, amountRs: 5000, channel };
        const ids = orders.map((o) =>
          bestCard(o, spend, TODAY).map((r) => r.cardId),
        );
        for (const order of ids) expect(order).toEqual(ids[0]);
      }
  });
});

describe("engine purity lint rule (Sec 13 step 3)", () => {
  it("rejects I/O, clocks and randomness in src/engine", async () => {
    const code = [
      'import { getFirestore } from "firebase/firestore";',
      'import { readFileSync } from "node:fs";',
      "export const a = Date.now() + Math.random();",
      "export const b = new Date();",
      'export const c = fetch("https://example.com");',
      'import { catalogue } from "../lib/catalogue";',
      "export const e = [process.env.KEY, globalThis.fetch, catalogue];",
      "export const d = [getFirestore, readFileSync];",
    ].join("\n");
    const [result] = await new ESLint().lintText(code, {
      filePath: "src/engine/probe.ts",
    });
    const rules = result.messages.map((m) => m.ruleId);
    expect(rules.filter((r) => r === "no-restricted-imports")).toHaveLength(3);
    expect(rules.filter((r) => r === "no-restricted-syntax")).toHaveLength(5);
    expect(rules).toContain("no-restricted-globals");
  }, 30_000);  // ESLint start-up can exceed the 5 s default
});
