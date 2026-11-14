import { dateIn, daysBetween } from "./dates";
import type { HeldCard } from "./types";

const TIERS = [0, 2, 5] as const; // PRD F10: reminders 5, 2 and 0 days before
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type DueDate = {
  cardId: string;
  kind: "statement" | "due";
  on: string; // ISO date
  daysLeft: number;
  tier: (typeof TIERS)[number] | null;
  text: string;
};

// The next statement and payment due dates from the days of the month the user entered (PRD F10).
export function dueDates(held: HeldCard[], today: Date): DueDate[] {
  const out: DueDate[] = [];
  for (const h of held) {
    for (const [kind, day] of [
      ["statement", h.statementDay],
      ["due", h.dueDay],
    ] as const) {
      if (day === undefined) continue;
      const y = today.getUTCFullYear();
      const m = today.getUTCMonth();
      const thisMonth = dateIn(y, m, day);
      const next = daysBetween(today, thisMonth) >= 0 ? thisMonth : dateIn(y, m + 1, day);
      const daysLeft = daysBetween(today, next);
      const label = `${next.getUTCDate()} ${MONTHS[next.getUTCMonth()]}`;
      out.push({
        cardId: h.cardId,
        kind,
        on: next.toISOString().slice(0, 10),
        daysLeft,
        tier: TIERS.find((t) => daysLeft <= t) ?? null,
        text:
          kind === "statement"
            ? daysLeft === 0
              ? `Statement today, ${label}.`
              : `Statement on ${label}, in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`
            : daysLeft === 0
              ? `Payment due today, ${label}.`
              : `Payment due on ${label}, in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`,
      });
    }
  }
  return out;
}
