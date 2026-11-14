import { dateIn, daysBetween } from "./dates";
import { formatRs } from "./format";
import { periodSpendRs } from "./progress";
import { betterMerchantRules, rewardRs, ruleFor } from "./rewards";
import type { HeldCard, Ranked, Spend } from "./types";

const listMerchants = (names: string[]): string =>
  names.length <= 3
    ? names.join(", ")
    : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;

// Sec 8.3 rule 5.
function repayNote(h: HeldCard, today: Date): string | null {
  if (h.statementDay === undefined || h.dueDay === undefined) return null;
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const thisStatement = dateIn(y, m, h.statementDay);
  const lastStatement =
    thisStatement.getTime() > today.getTime()
      ? dateIn(y, m - 1, h.statementDay)
      : thisStatement;
  const sinceStatement = daysBetween(lastStatement, today);
  if (sinceStatement >= 1 && sinceStatement <= 3)
    return "About 50 days to repay.";
  const dueThisMonth = dateIn(y, m, h.dueDay);
  const due =
    dueThisMonth.getTime() >= today.getTime()
      ? dueThisMonth
      : dateIn(y, m + 1, h.dueDay);
  const days = daysBetween(today, due);
  return days === 0 ? "Due today." : `${days} days to the due date.`;
}

// Sec 8.3 rule 4: shown as a separate line, never added to the ranking.
function milestoneBonus(h: HeldCard, amountRs: number): Ranked["bonus"] {
  for (const m of h.card.milestones) {
    const spent = periodSpendRs(h, m.period);
    if (spent !== null && spent < m.spendRs && spent + amountRs >= m.spendRs)
      return { benefit: m.benefit, benefitValueRs: m.benefitValueRs };
  }
  return null;
}

function rank(h: HeldCard, spend: Spend, today: Date): Ranked {
  const c = h.card;
  const base = { cardId: h.cardId, name: c.name, timing: repayNote(h, today) };
  const ineligible = (reason: string): Ranked => ({
    ...base,
    eligible: false,
    rewardRs: 0,
    ratePct: 0,
    reason,
    caveats: [],
    bonus: null,
  });

  if (spend.channel === "upi") {
    if (!c.upiOnCredit?.supported)
      return ineligible("This card cannot be used for UPI payments.");
    if (c.upiOnCredit.excluded.includes(spend.category))
      return ineligible(
        `This card's UPI rule does not cover ${spend.category}.`,
      );
  }

  const caveats: string[] = [];
  const { rule, excluded } = ruleFor(c, spend.category, spend.merchant);
  let ratePct = 0;
  let reward = 0;
  if (rule === null)
    caveats.push("This card has no reward rule for this spend.");
  else if (excluded)
    caveats.push(`No rewards on ${spend.category} with this card.`);
  else {
    ratePct =
      spend.channel === "upi"
        ? (c.upiOnCredit?.ratePct ?? rule.ratePct)
        : rule.ratePct;
    // Cap usage is entered against the rule's own category (the general rule is "other").
    const used = h.capUsedRs?.[rule.category];
    if (spend.channel === "upi")
      caveats.push(
        "Some banks give nothing on small UPI payments; we have not checked this card.",
      );
    reward = rewardRs(spend.amountRs, rule, ratePct, used ?? 0);
    if (rule.monthlyCapRs !== null) {
      const period = rule.capPeriod === "quarter" ? "quarterly" : "monthly";
      if (reward < rewardRs(spend.amountRs, rule, ratePct, 0, null))
        caveats.push(
          `Capped: the ${formatRs(rule.monthlyCapRs)} ${period} cap limits this reward.`,
        );
      if (used === undefined)
        caveats.push(
          `Assumes none of the ${formatRs(rule.monthlyCapRs)} ${period} cap is used yet.`,
        );
    }
    if (rule.pointValuePaisa !== null && rule.pointValuePaisa < 100)
      caveats.push(
        `Points valued at ${rule.pointValuePaisa} paise each, the bank's lowest stated value.`,
      );
  }
  if (rule === null || !rule.merchants.length)
    for (const r of betterMerchantRules(c, spend.category, ratePct))
      caveats.push(
        `${r.ratePct}% at ${listMerchants(r.merchants)}; not counted unless you pay there.`,
      );

  return {
    ...base,
    eligible: true,
    rewardRs: reward,
    ratePct,
    reason: `${formatRs(reward)} back on ${formatRs(spend.amountRs)} at ${ratePct}%.`,
    caveats,
    bonus: milestoneBonus(h, spend.amountRs),
  };
}

// Sec 8.3 rule 6: higher reward first, then lower annual fee, then card id. Deterministic.
export function bestCard(
  held: HeldCard[],
  spend: Spend,
  today: Date,
): Ranked[] {
  const fee = new Map(held.map((h) => [h.cardId, h.card.annualFeeRs]));
  return held
    .map((h) => rank(h, spend, today))
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.rewardRs - a.rewardRs ||
        (fee.get(a.cardId) ?? 0) - (fee.get(b.cardId) ?? 0) ||
        (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0),
    );
}
