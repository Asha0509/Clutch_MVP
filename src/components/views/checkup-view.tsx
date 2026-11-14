"use client";

import { Progress } from "@/components/ui/progress";
import { checkup } from "@/engine/checkup";
import { expiryReminders } from "@/engine/expiry";
import { formatRs } from "@/engine/format";
import { waiverProgress } from "@/engine/progress";
import type { HeldCard } from "@/engine/types";
import { impactLine } from "@/lib/alert-copy";
import { catalogue } from "@/lib/catalogue";
import type { UserAlert } from "@/lib/local-store";

// Pure views for PRD F3, F5 and F7. Every rupee figure comes from src/engine. The live checkup and
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
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Your checkup</h1>
        {result.atRiskRs > 0 ? (
          <p className="text-lg">
            <span
              data-testid="at-risk"
              className="block text-4xl font-semibold"
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

      {result.top3.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium">Fix these first</h2>
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
          <h2 className="font-medium">Changes to your cards</h2>
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
              <p>{impactLine(a.rupeesPerYear)}</p>
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
  const needsMonth =
    !h.card.lifetimeFree &&
    h.card.feeWaiverSpendRs !== null &&
    h.anniversaryMonth === undefined;
  return (
    <article className="space-y-2 rounded-lg border bg-card p-4">
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
          <Progress
            value={Math.min(
              100,
              Math.floor((waiver.spentRs * 100) / waiver.targetRs),
            )}
            aria-label="Fee waiver progress"
          />
          <p className="text-sm">
            {waiver.remainingRs === 0
              ? "Fee waiver reached."
              : `${formatRs(waiver.remainingRs ?? 0)} more in ${waiver.daysLeft} days to waive the fee${waiver.onTrack ? "; you are on pace." : "; you are behind pace."}`}
          </p>
        </div>
      )}
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
        <h2 className="font-medium">Card by card</h2>
        {held.map((h) => (
          <CardSummary key={h.cardId} h={h} today={today} />
        ))}
      </div>
    </>
  );
}
