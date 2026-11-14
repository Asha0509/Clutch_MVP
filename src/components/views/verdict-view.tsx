import { Badge } from "@/components/ui/badge";
import { formatRs } from "@/engine/format";
import type { Category, HeldCard, SpendProfile, Verdict } from "@/engine/types";
import { verdict } from "@/engine/verdict";
import { catalogue } from "@/lib/catalogue";
import { CATEGORY_LABELS } from "@/lib/labels";

const DECISION: Record<
  Verdict["decision"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  keep: { label: "Keep", variant: "default" },
  downgrade: { label: "Ask about a lower-fee card", variant: "secondary" },
  close: { label: "Consider closing", variant: "destructive" },
};

const netLine = (rs: number): string =>
  rs >= 0
    ? `Worth about ${formatRs(rs)} a year to you, after the fee.`
    : `Costs you about ${formatRs(-rs)} a year more than it gives back.`;

const spendLine = (profile: SpendProfile): string =>
  (Object.entries(profile) as [Category, number][])
    .filter(([, rs]) => rs > 0)
    .map(([c, rs]) => `${formatRs(rs)} on ${CATEGORY_LABELS[c].toLowerCase()}`)
    .join(", ");

// PRD F9 and Sec 8.4: keep, downgrade or close, from each card's own monthly spend. All figures from
// verdict() in src/engine. No referral link here: "find a better card" is user-initiated only (Sec 9).
export function VerdictView({
  held,
  profiles,
  today,
}: {
  held: HeldCard[];
  profiles: Record<string, SpendProfile>;
  today: Date;
}) {
  return (
    <div className="space-y-4">
      {held.map((h) => {
        const profile = profiles[h.cardId] ?? {};
        const v = verdict(h, held, catalogue.cards, profile, today);
        const d = DECISION[v.decision];
        return (
          <article
            key={h.cardId}
            data-testid={`verdict-${h.cardId}`}
            className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{h.card.name}</h3>
              <Badge variant={d.variant}>{d.label}</Badge>
            </div>
            <p className="text-lg font-semibold">{netLine(v.netValueRs)}</p>
            {Object.keys(profile).length > 0 && (
              <p className="text-sm text-muted-foreground">
                Based on a month of {spendLine(profile)}.
              </p>
            )}
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {v.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {v.caveats.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {v.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
