import { cardYear, daysBetween } from "./dates";
import { expiryReminders } from "./expiry";
import { formatRs } from "./format";
import { milestoneProgress, waiverProgress } from "./progress";
import { lowestPointPaisa } from "./rewards";
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
    const h = held.find((x) => x.cardId === r.cardId);
    if (r.kind === "expiring" && r.valueRs && h?.pointsBalance)
      items.push({
        cardId: r.cardId,
        kind: "points-expiry",
        rupees: r.valueRs,
        text: r.text,
        working: `${h.pointsBalance.toLocaleString("en-IN")} points × ${lowestPointPaisa(h.card)} paise = ${formatRs(r.valueRs)}, expiring in ${r.daysLeft} days.`,
      });
  }
  for (const h of held) {
    const w = waiverProgress(h, today);
    if (
      w?.onTrack === false &&
      w.spentRs !== null &&
      h.anniversaryMonth !== undefined &&
      h.card.annualFeeRs > 0
    ) {
      const year = cardYear(h.anniversaryMonth, h.openedOn, today);
      const total = daysBetween(year.start, year.end);
      const gone = daysBetween(year.start, today);
      const pace = gone > 0 ? Math.floor((w.spentRs * total) / gone) : 0;
      items.push({
        cardId: h.cardId,
        kind: "fee",
        rupees: h.card.annualFeeRs,
        text: `${formatRs(w.remainingRs ?? 0)} more spend in ${w.daysLeft} days waives the ${formatRs(h.card.annualFeeRs)} fee.`,
        working: `${formatRs(w.spentRs)} of ${formatRs(w.targetRs)} spent with ${gone} of ${total} days of the card year gone. At that pace the year ends near ${formatRs(pace)}, short of ${formatRs(w.targetRs)}, so the ${formatRs(h.card.annualFeeRs)} fee is counted.`,
      });
    }
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
          working: `${formatRs(m.spentRs ?? 0)} of ${formatRs(m.targetRs)} spent with ${m.daysLeft} days left in the period, behind pace; the benefit is valued at ${formatRs(m.benefitValueRs)}.`,
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
