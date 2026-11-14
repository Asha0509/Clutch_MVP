import { calendarPeriod, cardYear, daysBetween, type Bounds } from "./dates";
import type {
  HeldCard,
  Milestone,
  MilestoneStatus,
  WaiverProgress,
} from "./types";

// On pace if spend so far, stretched over the whole period, reaches the target (integer maths).
const onPace = (
  spent: number,
  target: number,
  b: Bounds,
  today: Date,
): boolean =>
  spent >= target ||
  spent * daysBetween(b.start, b.end) >= target * daysBetween(b.start, today);

export function waiverProgress(
  card: HeldCard,
  today: Date,
): WaiverProgress | null {
  const targetRs = card.card.feeWaiverSpendRs;
  // No fee month means we cannot place the card year, so the waiver is not tracked yet.
  if (
    card.card.lifetimeFree ||
    targetRs === null ||
    card.anniversaryMonth === undefined
  )
    return null;
  const year = cardYear(card.anniversaryMonth, card.openedOn, today);
  const spentRs = card.ytdSpendRs ?? null;
  return {
    spentRs,
    targetRs,
    remainingRs: spentRs === null ? null : Math.max(0, targetRs - spentRs),
    daysLeft: daysBetween(today, year.end),
    onTrack: spentRs === null ? null : onPace(spentRs, targetRs, year, today),
  };
}

export const periodSpendRs = (
  card: HeldCard,
  period: Milestone["period"],
): number | null =>
  // No calendar-year spend is collected, so "year" milestones stay unknown rather than use card-year spend.
  (period === "quarter"
    ? card.quarterSpendRs
    : period === "month"
      ? card.monthSpendRs
      : period === "anniversary-year"
        ? card.ytdSpendRs
        : undefined) ?? null;

const periodBounds = (
  card: HeldCard,
  period: Milestone["period"],
  today: Date,
): Bounds | null =>
  period !== "anniversary-year"
    ? calendarPeriod(period, today)
    : card.anniversaryMonth === undefined
      ? null
      : cardYear(card.anniversaryMonth, card.openedOn, today);

export function milestoneProgress(
  card: HeldCard,
  today: Date,
): MilestoneStatus[] {
  return card.card.milestones.map((m) => {
    const bounds = periodBounds(card, m.period, today);
    const spentRs = bounds === null ? null : periodSpendRs(card, m.period);
    const status: MilestoneStatus["status"] =
      spentRs === null || bounds === null
        ? "unknown"
        : spentRs >= m.spendRs
          ? "done"
          : onPace(spentRs, m.spendRs, bounds, today)
            ? "on-track"
            : "behind";
    return {
      benefit: m.benefit,
      benefitValueRs: m.benefitValueRs,
      period: m.period,
      targetRs: m.spendRs,
      spentRs,
      remainingRs: spentRs === null ? null : Math.max(0, m.spendRs - spentRs),
      daysLeft: bounds === null ? null : daysBetween(today, bounds.end),
      status,
    };
  });
}
