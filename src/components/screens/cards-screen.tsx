"use client";

import Link from "next/link";
import { useState } from "react";
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
import { type Category, SpendProfile, UserCard } from "@/engine/types";
import { todayUtc } from "@/lib/age";
import { catalogue } from "@/lib/catalogue";
import { CATEGORY_LABELS } from "@/lib/labels";
import {
  clearAll,
  exampleState,
  type LocalState,
  removeCardFrom,
  update,
} from "@/lib/local-store";
import { Gate } from "./gate";

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
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
type SpendDraft = Partial<Record<Category, string>>;

const toDraft = (c: UserCard): Draft =>
  Object.fromEntries(
    [...FIELDS.map((f) => f.key), "anniversaryMonth"].map((k) => [
      k,
      String(c[k as keyof UserCard] ?? ""),
    ]),
  ) as Draft;

const toSpendDraft = (p: SpendProfile = {}): SpendDraft =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));

// Blank means nothing spent there. Whole rupees only, like every other money input (zod checks it).
const fromSpendDraft = (d: SpendDraft) =>
  SpendProfile.safeParse(
    Object.fromEntries(
      Object.entries(d)
        .filter(([, v]) => v !== undefined && v.trim() !== "")
        .map(([k, v]) => [k, Number(v)]),
    ),
  );

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

// PRD Sec 13 step 10: export as JSON. Everything Clutch holds about the visitor is this one object.
function download(s: LocalState) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "clutch-my-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function CardsScreen() {
  return <Gate>{(s) => <Cards s={s} />}</Gate>;
}

// PRD F2: pick cards, add what you know. Saved in this browser; every screen recomputes at once.
function Cards({ s }: { s: LocalState }) {
  const held = s.cards;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<UserCard | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [spend, setSpend] = useState<SpendDraft>({});
  const [error, setError] = useState<string | null>(null);

  const heldIds = new Set(held.map((h) => h.cardId));
  const choices = catalogue.cards.filter(
    (c) =>
      !heldIds.has(c.id) &&
      `${c.name} ${c.issuer}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="space-y-8 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">My cards</h1>
        <p className="text-muted-foreground">
          Tap the cards you hold. Details are optional and make the checkup
          sharper.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => update(() => exampleState(todayUtc(new Date())))}
          >
            Fill with an example
          </Button>
          {held.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => download(s)}>
                Download my data
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear my data
              </Button>
            </>
          )}
        </div>
      </div>

      {held.length > 0 && (
        <ul className="space-y-3" aria-label="Cards you hold">
          {held.map((h) => (
            <li
              key={h.cardId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm"
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
                    setSpend(toSpendDraft(s.profiles[h.cardId]));
                  }}
                >
                  Add details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update((st) => removeCardFrom(st, h.cardId))}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {held.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Link href="/checkup" className={buttonVariants({ size: "lg" })}>
            See my checkup
          </Link>
          <Link
            href="/pay"
            className={buttonVariants({ size: "lg", variant: "secondary" })}
          >
            Which card to pay with
          </Link>
        </div>
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
                className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm text-left hover:bg-muted"
                onClick={() =>
                  update((st) => ({
                    ...st,
                    cards: [...st.cards, { cardId: c.id }],
                  }))
                }
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
                const profile = fromSpendDraft(spend);
                if (!parsed.success || !profile.success)
                  return setError(
                    "Check the values: whole rupees, days 1 to 31, last four digits only.",
                  );
                update((st) => ({
                  ...st,
                  cards: st.cards.map((c) =>
                    c.cardId === editing.cardId ? parsed.data : c,
                  ),
                  profiles: { ...st.profiles, [editing.cardId]: profile.data },
                }));
                setEditing(null);
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
              <fieldset className="space-y-3 pt-2">
                <legend className="font-medium">
                  A typical month on this card, in Rs
                </legend>
                <p className="text-sm text-muted-foreground">
                  Used for the verdict and to price bank changes for you. Leave
                  blank what you do not spend.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((c) => (
                    <Field key={c}>
                      <FieldLabel htmlFor={`spend-${c}`}>
                        {CATEGORY_LABELS[c]}
                      </FieldLabel>
                      <Input
                        id={`spend-${c}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={spend[c] ?? ""}
                        onChange={(e) =>
                          setSpend({ ...spend, [c]: e.target.value })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </fieldset>
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
