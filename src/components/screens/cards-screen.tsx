"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatRs } from "@/engine/format";
import { UserCard } from "@/engine/types";
import { catalogue } from "@/lib/catalogue";
import { useProfileUser } from "@/lib/use-user";
import { removeCard, saveCard, watchCards } from "@/lib/user-data";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const cardName = (id: string): string =>
  catalogue.cards.find((c) => c.id === id)?.name ?? id;

// Optional details (PRD F2, F5, F7). Every field can stay blank; blanks show as "unknown" on the checkup.
const FIELDS = [
  {
    key: "last4",
    label: "Last four digits (optional)",
    type: "text",
    inputMode: "numeric",
  },
  { key: "openedOn", label: "Date the card was opened", type: "date" },
  {
    key: "ytdSpendRs",
    label: "Spend since your fee month, in Rs",
    type: "number",
  },
  {
    key: "quarterSpendRs",
    label: "Spend this calendar quarter, in Rs",
    type: "number",
  },
  { key: "pointsBalance", label: "Points or cashback balance", type: "number" },
  { key: "pointsExpireOn", label: "Date the next points expire", type: "date" },
  { key: "statementDay", label: "Statement day of the month", type: "number" },
  { key: "dueDay", label: "Due day of the month", type: "number" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"] | "anniversaryMonth";
type Draft = Record<FieldKey, string>;

const toDraft = (c: UserCard): Draft =>
  Object.fromEntries(
    [...FIELDS.map((f) => f.key), "anniversaryMonth"].map((k) => [
      k,
      String(c[k as keyof UserCard] ?? ""),
    ]),
  ) as Draft;

function fromDraft(cardId: string, d: Draft, keep: UserCard) {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const text = (s: string) => (s.trim() === "" ? undefined : s.trim());
  return UserCard.safeParse({
    ...keep,
    cardId,
    last4: text(d.last4),
    openedOn: text(d.openedOn),
    anniversaryMonth: num(d.anniversaryMonth),
    ytdSpendRs: num(d.ytdSpendRs),
    quarterSpendRs: num(d.quarterSpendRs),
    pointsBalance: num(d.pointsBalance),
    pointsExpireOn: text(d.pointsExpireOn),
    statementDay: num(d.statementDay),
    dueDay: num(d.dueDay),
  });
}

export function CardsScreen() {
  const user = useProfileUser();
  const [held, setHeld] = useState<UserCard[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<UserCard | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchCards(user.uid, setHeld);
  }, [user]);

  const heldIds = useMemo(() => new Set(held.map((h) => h.cardId)), [held]);
  const choices = catalogue.cards.filter(
    (c) =>
      !heldIds.has(c.id) &&
      `${c.name} ${c.issuer}`.toLowerCase().includes(query.toLowerCase()),
  );

  if (!user) return <p className="py-10 text-muted-foreground">Loading…</p>;

  return (
    <section className="space-y-8 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">My cards</h1>
        <p className="text-muted-foreground">
          Tap the cards you hold. Details are optional and make the checkup
          sharper.
        </p>
      </div>

      {held.length > 0 && (
        <ul className="space-y-3" aria-label="Cards you hold">
          {held.map((h) => (
            <li
              key={h.cardId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"
            >
              <span className="font-medium">
                {cardName(h.cardId)}
                {h.last4 && (
                  <span className="text-muted-foreground">
                    {" "}
                    ending {h.last4}
                  </span>
                )}
              </span>
              <span className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setEditing(h);
                    setDraft(toDraft(h));
                  }}
                >
                  Add details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void removeCard(user.uid, h.cardId)}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {held.length > 0 && (
        <Link href="/checkup" className={buttonVariants({ size: "lg" })}>
          See my checkup
        </Link>
      )}

      <div className="space-y-3">
        <Field>
          <FieldLabel htmlFor="card-search">Find a card</FieldLabel>
          <Input
            id="card-search"
            placeholder="Bank or card name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <ul className="space-y-2" aria-label="Cards you can add">
          {choices.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted"
                onClick={() => void saveCard(user.uid, { cardId: c.id })}
              >
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.lifetimeFree
                      ? "No annual fee"
                      : `Annual fee ${formatRs(c.annualFeeRs)}`}
                  </span>
                </span>
                <span className="text-sm font-medium" aria-hidden>
                  Add
                </span>
              </button>
            </li>
          ))}
        </ul>
        {choices.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No more cards match. We cover {catalogue.cards.length} cards so far.
          </p>
        )}
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing && draft && (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{cardName(editing.cardId)}</DialogTitle>
              <DialogDescription>
                Fill in what you know. Never enter your full card number or CVV.
              </DialogDescription>
            </DialogHeader>
            <form
              id="card-details"
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = fromDraft(editing.cardId, draft, editing);
                if (!parsed.success)
                  return setError(
                    "Check the highlighted values: whole numbers, days 1 to 31, last four digits only.",
                  );
                saveCard(user.uid, parsed.data)
                  .then(() => setEditing(null))
                  .catch(() => setError("We could not save that. Try again."));
              }}
            >
              <Field>
                <FieldLabel htmlFor="anniversaryMonth">
                  Month your annual fee is charged
                </FieldLabel>
                <NativeSelect
                  id="anniversaryMonth"
                  value={draft.anniversaryMonth}
                  onChange={(e) =>
                    setDraft({ ...draft, anniversaryMonth: e.target.value })
                  }
                >
                  <NativeSelectOption value="">Not sure</NativeSelectOption>
                  {MONTHS.map((m, i) => (
                    <NativeSelectOption key={m} value={i + 1}>
                      {m}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {FIELDS.map((f) => (
                <Field key={f.key}>
                  <FieldLabel htmlFor={f.key}>{f.label}</FieldLabel>
                  <Input
                    id={f.key}
                    type={f.type}
                    inputMode={
                      "inputMode" in f
                        ? f.inputMode
                        : f.type === "number"
                          ? "numeric"
                          : undefined
                    }
                    min={f.type === "number" ? 0 : undefined}
                    value={draft[f.key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [f.key]: e.target.value })
                    }
                  />
                </Field>
              ))}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
            <DialogFooter>
              <Button type="submit" form="card-details">
                Save details
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
