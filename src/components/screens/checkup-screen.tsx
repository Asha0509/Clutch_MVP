"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { checkup } from "@/engine/checkup";
import { expiryReminders } from "@/engine/expiry";
import { formatRs } from "@/engine/format";
import { waiverProgress } from "@/engine/progress";
import type { HeldCard, UserCard } from "@/engine/types";
import { todayUtc } from "@/lib/age";
import { catalogue } from "@/lib/catalogue";
import { useProfileUser } from "@/lib/use-user";
import { impactLine } from "@/lib/alert-copy";
import { type UserAlert, watchAlerts, watchCards } from "@/lib/user-data";

const toHeld = (cards: UserCard[]): HeldCard[] =>
  cards.flatMap((u) => {
    const card = catalogue.cards.find((c) => c.id === u.cardId);
    return card ? [{ ...u, card }] : [];
  });

// PRD F3: one screen, total rupees at risk and the top three fixes. Every rupee figure comes from src/engine.
export function CheckupScreen() {
  const user = useProfileUser();
  const [cards, setCards] = useState<UserCard[] | null>(null);

  const [alerts, setAlerts] = useState<UserAlert[]>([]);

  useEffect(() => {
    if (!user) return;
    return watchCards(user.uid, setCards);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    return watchAlerts(user.uid, setAlerts);
  }, [user]);

  if (!user || cards === null)
    return <p className="py-10 text-muted-foreground">Loading…</p>;

  const held = toHeld(cards);
  if (held.length === 0)
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-2xl font-semibold">Your checkup</h1>
        <p className="text-muted-foreground">Add the cards you hold first.</p>
        <Link href="/cards" className={buttonVariants({ size: "lg" })}>
          Add cards
        </Link>
      </section>
    );

  const today = todayUtc(new Date());
  const result = checkup(held, today);
  const reminders = expiryReminders(held, today);

  return (
    <section className="space-y-8 py-6">
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

      <div className="space-y-4">
        <h2 className="font-medium">Card by card</h2>
        {held.map((h) => {
          const waiver = waiverProgress(h, today);
          const mine = reminders.filter((r) => r.cardId === h.cardId);
          const needsMonth =
            !h.card.lifetimeFree &&
            h.card.feeWaiverSpendRs !== null &&
            h.anniversaryMonth === undefined;
          return (
            <article
              key={h.cardId}
              className="space-y-2 rounded-lg border bg-card p-4"
            >
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
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/pay" className={buttonVariants()}>
          Which card to pay with
        </Link>

        <Link
          href="/cards"
          className={buttonVariants({ variant: "secondary" })}
        >
          Edit my cards
        </Link>
      </div>
    </section>
  );
}
