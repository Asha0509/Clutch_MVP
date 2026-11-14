import { expiryReminders } from "./expiry";
import { formatRs } from "./format";
import { milestoneProgress, waiverProgress } from "./progress";
import type { HeldCard, RiskItem } from "./types";

const MILESTONE_WINDOW_DAYS = 30;

const byRupees = (a: RiskItem, b: RiskItem): number =>
  b.rupees - a.rupees ||
  (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0) ||
  (a.kind < b.kind ? -1 : 1);

// Rupees at risk: points expiring within 60 days, fees where the waiver is behind pace, and milestones
// behind pace with under 30 days left. Unknowns are never counted as risk or as safe.
export function checkup(
  held: HeldCard[],
  today: Date,
): { atRiskRs: number; items: RiskItem[]; top3: RiskItem[] } {
  const items: RiskItem[] = [];
  for (const r of expiryReminders(held, today)) {
    if (r.kind === "expiring" && r.valueRs)
      items.push({
        cardId: r.cardId,
        kind: "points-expiry",
        rupees: r.valueRs,
        text: r.text,
      });
  }
  for (const h of held) {
    const w = waiverProgress(h, today);
    if (w?.onTrack === false && h.card.annualFeeRs > 0)
      items.push({
        cardId: h.cardId,
        kind: "fee",
        rupees: h.card.annualFeeRs,
        text: `${formatRs(w.remainingRs ?? 0)} more spend in ${w.daysLeft} days waives the ${formatRs(h.card.annualFeeRs)} fee.`,
      });
    for (const m of milestoneProgress(h, today)) {
      if (
        m.status === "behind" &&
        m.daysLeft !== null &&
        m.daysLeft < MILESTONE_WINDOW_DAYS &&
        m.benefitValueRs
      )
        items.push({
          cardId: h.cardId,
          kind: "milestone",
          rupees: m.benefitValueRs,
          text: `${formatRs(m.remainingRs ?? 0)} more spend in ${m.daysLeft} days earns: ${m.benefit}.`,
        });
    }
  }
  items.sort(byRupees);
  return {
    atRiskRs: items.reduce((s, i) => s + i.rupees, 0),
    items,
    top3: items.slice(0, 3),
  };
}
