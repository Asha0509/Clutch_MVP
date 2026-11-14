"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { bestCard } from "@/engine/bestCard";
import { formatRs } from "@/engine/format";
import type {
  Category,
  HeldCard,
  Ranked,
  Spend,
  UserCard,
} from "@/engine/types";
import { todayUtc } from "@/lib/age";
import { catalogue } from "@/lib/catalogue";
import { CATEGORY_LABELS } from "@/lib/labels";
import { useProfileUser } from "@/lib/use-user";
import { watchCards } from "@/lib/user-data";

const toHeld = (cards: UserCard[]): HeldCard[] =>
  cards.flatMap((u) => {
    const card = catalogue.cards.find((c) => c.id === u.cardId);
    return card ? [{ ...u, card }] : [];
  });

function Result({
  r,
  card,
  testId,
  note,
}: {
  r: Ranked;
  card: HeldCard["card"];
  testId: string;
  note?: string;
}) {
  return (
    <article
      data-testid={testId}
      className="space-y-2 rounded-lg border bg-card p-4"
    >
      <h3 className="font-medium">{r.name}</h3>
      <p className="text-2xl font-semibold">{formatRs(r.rewardRs)} back</p>
      <p className="text-sm">{r.reason}</p>
      {note && <p className="text-sm">{note}</p>}
      {card.upiOnCredit?.supported && (
        <p className="text-sm font-medium text-foreground">
          UPI works on this card.
        </p>
      )}
      {r.timing && <p className="text-sm text-muted-foreground">{r.timing}</p>}
      {r.bonus && (
        <p className="rounded-md border-l-4 border-success bg-muted p-2 text-sm">
          This payment would complete a milestone: {r.bonus.benefit}
          {r.bonus.benefitValueRs !== null &&
            ` (${formatRs(r.bonus.benefitValueRs)})`}
          . Not counted in the ranking.
        </p>
      )}
      {r.caveats.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {r.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Card facts checked against the bank&apos;s documents on{" "}
        {card.verified.on}.{" "}
        <a className="underline" href={card.verified.sourceUrl}>
          Source
        </a>
      </p>
    </article>
  );
}

// PRD F8 and Sec 4 journey 3. Ranking, reasons and caveats all come from bestCard in src/engine.
export function PayScreen() {
  const user = useProfileUser();
  const [cards, setCards] = useState<UserCard[] | null>(null);
  const [category, setCategory] = useState<Category>("groceries");
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<Spend["channel"]>("card");
  const [merchant, setMerchant] = useState("");

  useEffect(() => {
    if (!user) return;
    return watchCards(user.uid, setCards);
  }, [user]);

  if (!user || cards === null)
    return <p className="py-10 text-muted-foreground">Loading…</p>;
  const held = toHeld(cards);
  const merchants = [
    ...new Set(held.flatMap((h) => h.card.rewards.flatMap((r) => r.merchants))),
  ].sort();
  const amountRs = Number(amount);
  const ready = held.length > 0 && Number.isInteger(amountRs) && amountRs > 0;
  const ranked = ready
    ? bestCard(
        held,
        { category, amountRs, channel, merchant: merchant.trim() || undefined },
        todayUtc(new Date()),
      )
    : [];
  const usable = ranked.filter((r) => r.eligible);
  const cannot = ranked.filter((r) => !r.eligible);
  const earns = usable.length > 0 && usable[0].rewardRs > 0;
  // Sec 8.3 rule 6, made visible: when the reward ties, say why this card is listed first.
  const feeOf = (id: string) =>
    held.find((h) => h.cardId === id)?.card.annualFeeRs ?? 0;
  const tieNote =
    usable.length > 1 && usable[0].rewardRs === usable[1].rewardRs
      ? feeOf(usable[0].cardId) < feeOf(usable[1].cardId)
        ? `Same reward as ${usable[1].name}; this card has the lower annual fee.`
        : `Same reward and annual fee as ${usable[1].name}.`
      : undefined;
  const cardOf = (id: string) => held.find((h) => h.cardId === id)!.card;
  // Cards after the top one (and runner-up) keep every caveat, bonus and timing (Sec 8.3 rules 2, 4, 7).
  const rest = usable.slice(earns ? 2 : 0);

  return (
    <section className="space-y-8 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Which card to pay with</h1>
        <p className="text-muted-foreground">
          Best of the cards you hold, for this payment.
        </p>
      </div>

      {held.length === 0 ? (
        <Link href="/cards" className={buttonVariants({ size: "lg" })}>
          Add your cards first
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pay-category">
              What are you paying for
            </FieldLabel>
            <NativeSelect
              id="pay-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <NativeSelectOption key={id} value={id}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="pay-amount">Amount in Rs</FieldLabel>
            <Input
              id="pay-amount"
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pay-channel">How you pay</FieldLabel>
            <NativeSelect
              id="pay-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Spend["channel"])}
            >
              <NativeSelectOption value="card">Card</NativeSelectOption>
              <NativeSelectOption value="upi">UPI</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="pay-merchant">
              Shop or app (optional)
            </FieldLabel>
            <Input
              id="pay-merchant"
              list="pay-merchants"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
            <datalist id="pay-merchants">
              {merchants.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>
      )}

      {ready && (
        <div className="space-y-4">
          {earns ? (
            <>
              <Result
                r={usable[0]}
                card={cardOf(usable[0].cardId)}
                testId="top-card"
                note={tieNote}
              />
              {usable[1] && (
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Next best
                  </h2>
                  <Result
                    r={usable[1]}
                    card={cardOf(usable[1].cardId)}
                    testId="runner-up"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="rounded-lg border bg-card p-4">
              {usable.length > 0
                ? "None of your cards earn rewards on this."
                : "None of your cards can be used for this payment."}
            </p>
          )}
          {rest.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {earns ? "Your other cards" : "Your cards"}
              </h2>
              {rest.map((r) => (
                <Result
                  key={r.cardId}
                  r={r}
                  card={cardOf(r.cardId)}
                  testId="other-card"
                />
              ))}
            </div>
          )}
          {cannot.length > 0 && (
            <div data-testid="cannot-use" className="space-y-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                Cannot use
              </h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {cannot.map((r) => (
                  <li key={r.cardId}>
                    {r.name}: {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Rewards are worked out from each bank&apos;s published terms and
            rounded down. Card rules can change; check the bank&apos;s own terms
            for large payments.
          </p>
        </div>
      )}
    </section>
  );
}
