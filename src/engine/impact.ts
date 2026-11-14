import { formatRs } from "./format";
import { earningMonthlyRs, monthlyCap, rewardRs, ruleFor } from "./rewards";
import type { Change, HeldCard, SpendProfile } from "./types";

// Change in the user's yearly value from a rule change; negative means they lose. null when it cannot be priced.
export function impactOfChange(
  card: HeldCard,
  change: Change,
  profile: SpendProfile,
): { rupeesPerYear: number | null; explanation: string } {
  if (change.kind === "fee") {
    // A fee change applies at the next renewal, so the spend profile decides whether it is waived.
    const c = card.card;
    const waives =
      c.lifetimeFree ||
      (c.feeWaiverSpendRs !== null &&
        earningMonthlyRs(c, profile) * 12 >= c.feeWaiverSpendRs);
    if (waives)
      return {
        rupeesPerYear: 0,
        explanation:
          "Your spend waives this card's annual fee, so the change costs you nothing.",
      };
    const rupeesPerYear = change.beforeRs - change.afterRs;
    return {
      rupeesPerYear,
      explanation: `The annual fee moves from ${formatRs(change.beforeRs)} to ${formatRs(change.afterRs)}.`,
    };
  }
  if (change.kind === "other")
    return { rupeesPerYear: null, explanation: change.description };

  const monthlyRs = profile[change.category] ?? 0;
  const { rule, excluded } = ruleFor(card.card, change.category);
  if (rule === null || excluded || monthlyRs === 0)
    return {
      rupeesPerYear: 0,
      explanation: `This does not affect your ${change.category} spend.`,
    };
  const at = (pct: number): number =>
    rewardRs(monthlyRs, rule, pct, 0, monthlyCap(rule));
  const rupeesPerYear = (at(change.afterPct) - at(change.beforePct)) * 12;
  return {
    rupeesPerYear,
    explanation: `On ${formatRs(monthlyRs)} a month of ${change.category} spend, the rate moves from ${change.beforePct}% to ${change.afterPct}%.`,
  };
}
