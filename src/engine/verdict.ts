import { formatRs } from "./format";
import { waiverProgress } from "./progress";
import { earningMonthlyRs, monthlyCap, rewardRs, ruleFor } from "./rewards";
import type {
  Card,
  Category,
  HeldCard,
  RewardRule,
  SpendProfile,
  Verdict,
} from "./types";

const MONTHS_PER: Record<
  "month" | "quarter" | "year" | "anniversary-year",
  number
> = {
  month: 1,
  quarter: 3,
  year: 12,
  "anniversary-year": 12,
};

// Yearly reward from a monthly spend profile. Spend sharing a rule shares its cap, which is applied
// per month. Merchant-only rates are not counted, since the profile has no merchants.
export function annualRewardRs(card: Card, profile: SpendProfile): number {
  const perRule = new Map<RewardRule, number>();
  for (const [category, monthlyRs] of Object.entries(profile) as [
    Category,
    number,
  ][]) {
    const { rule, excluded } = ruleFor(card, category);
    if (rule && !excluded && monthlyRs > 0)
      perRule.set(rule, (perRule.get(rule) ?? 0) + monthlyRs);
  }
  let monthly = 0;
  for (const [rule, spend] of perRule)
    monthly += rewardRs(spend, rule, rule.ratePct, 0, monthlyCap(rule));
  return monthly * 12;
}

// Sec 8.4. Net value = rewards + milestones hit + lounge value (only if the user entered it) - fee.
export function verdict(
  card: HeldCard,
  held: HeldCard[],
  catalogue: Card[],
  profile: SpendProfile,
  today: Date,
): Verdict {
  const c = card.card;
  const reasons: string[] = [];
  const caveats: string[] = [];
  const monthly = earningMonthlyRs(c, profile);

  const rewardsRs = annualRewardRs(c, profile);
  reasons.push(`Rewards on your spend: ${formatRs(rewardsRs)} a year.`);
  if (c.rewards.some((r) => r.merchants.length > 0))
    caveats.push(
      "Merchant-only rates are not counted; your spend profile has no merchants.",
    );

  let milestonesRs = 0;
  for (const m of c.milestones) {
    const perPeriod = monthly * MONTHS_PER[m.period];
    if (perPeriod < m.spendRs) continue;
    if (m.benefitValueRs === null)
      caveats.push(`Milestone not valued: ${m.benefit}.`);
    else milestonesRs += m.benefitValueRs * (12 / MONTHS_PER[m.period]);
  }
  if (milestonesRs > 0)
    reasons.push(
      `Milestones your spend reaches: ${formatRs(milestonesRs)} a year.`,
    );

  let loungeRs = 0;
  const lounge = c.lounge;
  if (lounge) {
    if (
      card.loungeVisitsPerYear === undefined ||
      card.loungeValueRs === undefined
    )
      caveats.push(
        "Lounge value not counted: add your visits a year and what a visit is worth to you.",
      );
    else {
      const gateSpend = lounge.gatePeriod === "month" ? monthly : monthly * 3;
      if (lounge.spendGateRs !== null && gateSpend < lounge.spendGateRs)
        caveats.push(
          `Lounge not counted: it needs ${formatRs(lounge.spendGateRs)} spend first.`,
        );
      else {
        const free =
          (lounge.domesticPerQuarter ?? 0) * 4 +
          (lounge.domesticPerYear ?? 0) +
          (lounge.internationalPerYear ?? 0);
        loungeRs =
          Math.min(card.loungeVisitsPerYear, free) * card.loungeValueRs;
        reasons.push(
          `Lounge visits at your own value: ${formatRs(loungeRs)} a year.`,
        );
      }
    }
  }

  // This year's fee uses the waiver pace if spend was entered; next year's uses the spend profile only.
  const profileWaives =
    c.feeWaiverSpendRs !== null && monthly * 12 >= c.feeWaiverSpendRs;
  const waiver = waiverProgress(card, today);
  const waived =
    c.lifetimeFree ||
    (c.feeWaiverSpendRs !== null && (waiver?.onTrack ?? profileWaives));
  const feeRs = waived ? 0 : c.annualFeeRs;
  const nextFeeRs = c.lifetimeFree || profileWaives ? 0 : c.annualFeeRs;
  reasons.push(
    waived
      ? "No annual fee on your spend this year."
      : `Annual fee: ${formatRs(feeRs)}.`,
  );

  const valueRs = rewardsRs + milestonesRs + loungeRs;
  const netValueRs = valueRs - feeRs;
  const nextYearNetRs = valueRs - nextFeeRs;
  if (netValueRs >= 0 && nextYearNetRs >= 0)
    return { decision: "keep", reasons, caveats, netValueRs };
  if (nextYearNetRs < 0 && netValueRs >= 0)
    reasons.push(
      `Next year your spend will not waive the ${formatRs(c.annualFeeRs)} fee, so the card would cost you money.`,
    );

  const cheaper = catalogue.some(
    (x) =>
      x.issuer === c.issuer && x.id !== c.id && x.annualFeeRs < c.annualFeeRs,
  );
  if (cheaper) {
    reasons.push(
      `${c.issuer} has a card with a lower fee; ask about switching before the renewal.`,
    );
    return { decision: "downgrade", reasons, caveats, netValueRs };
  }

  const others = held.filter((h) => h.cardId !== card.cardId);
  const mayBeOldest =
    card.openedOn === undefined ||
    others.some((h) => h.openedOn === undefined) ||
    others.every((h) => (h.openedOn ?? "") > (card.openedOn ?? ""));
  if (mayBeOldest) {
    caveats.push(
      "This may be your oldest card. Closing it can shorten your credit history.",
    );
    return { decision: "keep", reasons, caveats, netValueRs };
  }
  caveats.push(
    "Closing a card can change your credit utilisation; pay it off first.",
  );
  return { decision: "close", reasons, caveats, netValueRs };
}
