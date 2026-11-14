import type { Card, Category, RewardRule } from "./types";

// "Swiggy (food delivery only)" matches "swiggy".
const norm = (name: string): string =>
  name
    .replace(/\s*\(.*\)\s*$/, "")
    .trim()
    .toLowerCase();

const byRate = (a: RewardRule, b: RewardRule): number => b.ratePct - a.ratePct;

// Sec 8.3 rule 1. A merchant rule applies only when the merchant matches. Otherwise the category rule,
// then the card's general "other" rule. Exclusions are read from the rule that was chosen.
export function ruleFor(
  card: Card,
  category: Category,
  merchant?: string,
): { rule: RewardRule | null; excluded: boolean } {
  const inCategory = card.rewards.filter((r) => r.category === category);
  const byMerchant =
    merchant === undefined
      ? []
      : inCategory.filter((r) =>
          r.merchants.some((m) => norm(m) === norm(merchant)),
        );
  const general = inCategory.filter((r) => r.merchants.length === 0);
  const fallback = card.rewards.filter(
    (r) => r.category === "other" && r.merchants.length === 0,
  );
  const rule =
    [byMerchant, general, fallback]
      .map((rs) => [...rs].sort(byRate)[0])
      .find(Boolean) ?? null;
  return {
    rule,
    excluded: rule !== null && rule.exclusions.includes(category),
  };
}

// Merchant-only rates in this category that beat the rate applied, for a caveat line.
export const betterMerchantRules = (
  card: Card,
  category: Category,
  appliedPct: number,
): RewardRule[] =>
  card.rewards.filter(
    (r) =>
      r.category === category &&
      r.merchants.length > 0 &&
      r.ratePct > appliedPct,
  );

// Whole rupees, floored so we never overstate (Sec 2). Rates are held in thousandths of a percent so the
// arithmetic stays in integers: 1.875% -> 1875, and Rs 10,000 x 1875 / 1,00,000 = Rs 187.
export function rewardRs(
  amountRs: number,
  rule: RewardRule,
  ratePct: number,
  usedRs = 0,
  capRs: number | null = rule.monthlyCapRs,
): number {
  const milli = Math.round(ratePct * 1000);
  const raw = (amount: number): number => Math.floor((amount * milli) / 100000);
  if (capRs === null || rule.capBasis === null) return raw(amountRs);
  const left = Math.max(0, capRs - usedRs);
  return rule.capBasis === "spend"
    ? raw(Math.min(amountRs, left))
    : Math.min(raw(amountRs), left);
}

// A monthly view of a rule's cap; quarterly caps are spread over three months.
export const monthlyCap = (rule: RewardRule): number | null =>
  rule.monthlyCapRs === null
    ? null
    : rule.capPeriod === "quarter"
      ? Math.floor(rule.monthlyCapRs / 3)
      : rule.monthlyCapRs;

// Lowest stated rupee value of the card's points (Founder decision 1), for valuing a balance.
export function lowestPointPaisa(card: Card): number | null {
  const values = card.rewards
    .map((r) => r.pointValuePaisa)
    .filter((v): v is number => v !== null);
  return values.length === 0 ? null : Math.min(...values);
}

export function pointsValueRs(card: Card, points: number): number | null {
  const paisa = lowestPointPaisa(card);
  return paisa === null ? null : Math.floor((points * paisa) / 100);
}

// Monthly spend that earns on this card. Excluded spend is left out of waiver and milestone estimates so they
// are never overstated; issuers' own waiver rules may count more.
export function earningMonthlyRs(
  card: Card,
  profile: Partial<Record<Category, number>>,
): number {
  let total = 0;
  for (const [category, monthlyRs] of Object.entries(profile) as [
    Category,
    number,
  ][]) {
    const { rule, excluded } = ruleFor(card, category);
    if (rule && !excluded) total += monthlyRs;
  }
  return total;
}
