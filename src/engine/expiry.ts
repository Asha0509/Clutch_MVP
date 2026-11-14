import { daysBetween, parseIso } from "./dates";
import { formatRs } from "./format";
import { pointsValueRs } from "./rewards";
import type { HeldCard, Reminder } from "./types";

const TIERS = [7, 30, 60] as const; // Sec 10.5

// A null catalogue expiry means unknown (Founder decision 3): it is flagged, never treated as safe.
export function expiryReminders(held: HeldCard[], today: Date): Reminder[] {
  const out: Reminder[] = [];
  for (const h of held) {
    const expiry = h.card.pointsExpiryMonths;
    if (!h.pointsBalance || expiry === "never") continue;
    if (h.pointsExpireOn === undefined) {
      out.push({
        cardId: h.cardId,
        kind: "unknown",
        daysLeft: null,
        tier: null,
        valueRs: null,
        text:
          expiry === null
            ? "We do not know when these points expire. Check with the bank."
            : `Points expire ${expiry} months after they are earned. Add the expiry date from your statement.`,
      });
      continue;
    }
    const daysLeft = daysBetween(today, parseIso(h.pointsExpireOn));
    const tier = TIERS.find((t) => daysLeft >= 0 && daysLeft <= t);
    if (tier === undefined) continue;
    const valueRs = pointsValueRs(h.card, h.pointsBalance);
    out.push({
      cardId: h.cardId,
      kind: "expiring",
      daysLeft,
      tier,
      valueRs,
      text: `${valueRs === null ? "Points" : `${formatRs(valueRs)} of points`} expire in ${daysLeft} days.`,
    });
  }
  return out;
}
