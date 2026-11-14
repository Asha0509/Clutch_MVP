"use client";

import { Progress } from "@/components/ui/progress";
import { checkup } from "@/engine/checkup";
import { dueDates } from "@/engine/due";
import { expiryReminders } from "@/engine/expiry";
import { formatRs } from "@/engine/format";
import { milestoneProgress, waiverProgress } from "@/engine/progress";
import type { HeldCard } from "@/engine/types";
import { impactLine } from "@/lib/alert-copy";
import { catalogue } from "@/lib/catalogue";
import type { UserAlert } from "@/lib/local-store";

const pct = (part: number, whole: number): number =>
  whole <= 0 ? 100 : Math.min(100, Math.floor((part * 100) / whole));

function Bar({ label, value }: { label: string; value: number }) {
  return <Progress value={value} aria-label={label} />;
}

// Pure views for PRD F3, F5, F6, F7 and F10. Every rupee figure comes from src/engine. The live checkup and
// the demo pass their own cards, alerts and today's date; nothing here reads Firebase.

export function AtRiskSummary({
  held,
  today,
}: {
  held: HeldCard[];
  today: Date;
}) {
  const result = checkup(held, today);
  return (
    <>
      <div className="space-y-3 rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
        <h1 className="text-sm font-medium uppercase tracking-wide opacity-80">
          Your checkup
        </h1>
        {result.atRiskRs > 0 ? (
          <p className="text-lg">
            <span
              data-testid="at-risk"
              className="block text-5xl font-semibold tracking-tight text-accent"
            >
              {formatRs(result.atRiskRs)}
            </span>
            at risk across your {held.length}{" "}
            {held.length === 1 ? "card" : "cards"}, from what you have told us.
          </p>
        ) : (
          <p className="text-lg">
            <span data-testid="at-risk" className="sr-only">
              {formatRs(0)}
            </span>
            Nothing at risk from what you have told us so far.
          </p>
        )}
      </div>

      {result.items.length > 0 && (
        <details className="rounded-lg border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            How we worked out {formatRs(result.atRiskRs)}
          </summary>
          <ul className="mt-2 space-y-2">
            {result.items.map((item) => (
              <li key={`${item.cardId}-${item.kind}`}>
                <span className="block text-muted-foreground">
                  {catalogue.cards.find((c) => c.id === item.cardId)?.name}
                </span>
                {item.working}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground">
            Worked out by Clutch&apos;s rules engine from each bank&apos;s
            published terms and the numbers you entered. Rupees are rounded
            down, so nothing is overstated.
          </p>
        </details>
      )}

      {result.top3.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Fix these first</h2>
          <ol className="space-y-2">
            {result.top3.map((item) => (
              <li
                key={`${item.cardId}-${item.kind}`}
                className="rounded-lg border-l-4 border-warning bg-card p-3"
              >
                <span className="block text-sm text-muted-foreground">
                  {catalogue.cards.find((c) => c.id === item.cardId)?.name}
                </span>
                <span className="block">{item.text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

export function ChangeList({ alerts }: { alerts: UserAlert[] }) {
  return (
    <>
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Changes to your cards</h2>
          {alerts.map((a) => (
            <article
              key={a.alertId}
              className="space-y-1 rounded-lg border-l-4 border-warning bg-card p-3 text-sm"
            >
              <p className="text-muted-foreground">
                {catalogue.cards.find((c) => c.id === a.cardId)?.name}
              </p>
              <p className="font-medium">{a.title}</p>
              <p>Before: {a.before ?? "not stated"}</p>
              <p>After: {a.after ?? "not stated"}</p>
              <p className="font-medium">{impactLine(a.rupeesPerYear)}</p>
              {a.explanation && a.rupeesPerYear !== null && (
                <p className="text-muted-foreground">{a.explanation}</p>
              )}
              <a className="underline" href={a.issuerUrl}>
                The bank&apos;s notice
              </a>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function CardSummary({ h, today }: { h: HeldCard; today: Date }) {
  const waiver = waiverProgress(h, today);
  const mine = expiryReminders([h], today);
  const milestones = milestoneProgress(h, today).filter(
    (m) => m.spentRs !== null,
  );
  const due = dueDates([h], today);
  const lounge = h.card.lounge;
  const loungeSpend =
    lounge?.gatePeriod === "month" ? h.monthSpendRs : h.quarterSpendRs;
  const needsMonth =
    !h.card.lifetimeFree &&
    h.card.feeWaiverSpendRs !== null &&
    h.anniversaryMonth === undefined;
  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="font-medium">{h.card.name}</h3>
      <p className="text-sm">
        {h.card.lifetimeFree
          ? "No annual fee."
          : `Annual fee ${formatRs(h.card.annualFeeRs)}.`}
        {h.card.feeWaiverSpendRs !== null &&
          !h.card.lifetimeFree &&
          ` Waived if you spend ${formatRs(h.card.feeWaiverSpendRs)} in a card year.`}
      </p>
      {waiver?.spentRs != null && (
        <div className="space-y-1">
          <Bar
            label="Fee waiver progress"
            value={pct(waiver.spentRs, waiver.targetRs)}
          />
          <p className="text-sm">
            {waiver.remainingRs === 0
              ? "Fee waiver reached."
              : `${formatRs(waiver.remainingRs ?? 0)} more in ${waiver.daysLeft} days to waive the fee${waiver.onTrack ? "; you are on pace." : "; you are behind pace."}`}
          </p>
        </div>
      )}
      {milestones.map((m) => (
        <div key={m.benefit} className="space-y-1">
          <Bar
            label={`Milestone: ${m.benefit}`}
            value={pct(m.spentRs ?? 0, m.targetRs)}
          />
          <p className="text-sm">
            {m.status === "done"
              ? `Milestone reached: ${m.benefit}.`
              : `${formatRs(m.remainingRs ?? 0)} more${m.daysLeft === null ? "" : ` in ${m.daysLeft} days`} for ${m.benefit}${m.status === "behind" ? "; behind pace." : "."}`}
          </p>
        </div>
      ))}
      {lounge?.spendGateRs != null && loungeSpend !== undefined && (
        <div className="space-y-1">
          <Bar
            label="Lounge access spend"
            value={pct(loungeSpend, lounge.spendGateRs)}
          />
          <p className="text-sm">
            {loungeSpend >= lounge.spendGateRs
              ? "Lounge spend reached for this period."
              : `${formatRs(lounge.spendGateRs - loungeSpend)} more spend this ${lounge.gatePeriod === "month" ? "month" : "quarter"} for lounge access.`}
          </p>
        </div>
      )}
      {due.map((d) => (
        <p
          key={d.kind}
          className={d.tier !== null ? "text-sm font-medium" : "text-sm"}
        >
          {d.text}
        </p>
      ))}
      {mine.map((r) => (
        <p key={r.kind} className="text-sm">
          {r.text}
        </p>
      ))}
      {(needsMonth || (waiver && waiver.spentRs === null)) && (
        <p className="text-sm text-muted-foreground">
          {needsMonth
            ? "Add the month your fee is charged"
            : "Add your spend since that month"}{" "}
          to track the fee waiver.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Card facts checked against the bank&apos;s documents on{" "}
        {h.card.verified.on}.{" "}
        <a className="underline" href={h.card.verified.sourceUrl}>
          Source
        </a>
      </p>
    </article>
  );
}

export function CheckupView({
  held,
  alerts,
  today,
}: {
  held: HeldCard[];
  alerts: UserAlert[];
  today: Date;
}) {
  return (
    <>
      <AtRiskSummary held={held} today={today} />
      <ChangeList alerts={alerts} />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Card by card</h2>
        {held.map((h) => (
          <CardSummary key={h.cardId} h={h} today={today} />
        ))}
      </div>
    </>
  );
}
