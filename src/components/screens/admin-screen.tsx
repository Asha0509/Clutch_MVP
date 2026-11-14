"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatRs } from "@/engine/format";
import type { Category, Change } from "@/engine/types";
import { catalogue } from "@/lib/catalogue";
import { CATEGORY_LABELS } from "@/lib/labels";
import {
  approve,
  type LocalState,
  reject,
  update,
} from "@/lib/local-store";
import { Gate } from "./gate";

type Pending = {
  id: string;
  cardId: string;
  title: string;
  before: string | null;
  after: string | null;
  feedTier: string | null;
  feedUrl: string | null;
  feedDate: string;
};
const cardName = (id: string) =>
  catalogue.cards.find((c) => c.id === id)?.name ?? id;

// PRD Sec 10.2: open the bank's notice, confirm before and after, paste the notice link, set the tier,
// then approve or reject. In the prototype the "users" are this browser's visitor; the production
// path is approveAlert in functions/src/index.ts, which checks the admin claim on the server.
function Review({
  alert,
  onDone,
}: {
  alert: Pending;
  onDone: (message: string) => void;
}) {
  const [issuerUrl, setIssuerUrl] = useState(alert.feedUrl ?? "");
  const [tier, setTier] = useState("official");
  const [kind, setKind] = useState<Change["kind"]>("other");
  const [category, setCategory] = useState<Category>("other");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [checked, setChecked] = useState(false);

  const change = (): Change =>
    kind === "fee"
      ? { kind, beforeRs: Number(before), afterRs: Number(after) }
      : kind === "rate"
        ? { kind, category, beforePct: Number(before), afterPct: Number(after) }
        : { kind: "other", description: alert.title };

  // A priced change needs both values, as numbers, and they must differ (the server checks this too).
  const priced =
    kind === "other" ||
    (before.trim() !== "" &&
      after.trim() !== "" &&
      Number.isFinite(Number(before)) &&
      Number.isFinite(Number(after)) &&
      Number(before) !== Number(after));

  const decide = (decision: "approve" | "reject") => {
    if (decision === "reject") {
      update((st) => reject(st, alert.id));
      return onDone(`Rejected "${alert.title}". Nothing was sent.`);
    }
    let sent: LocalState["alerts"][number] | undefined;
    update((st) => {
      const next = approve(st, alert, { issuerUrl, change: change() });
      sent = next.alerts.find((x) => x.alertId === alert.id);
      return next;
    });
    onDone(
      !sent
        ? `Approved "${alert.title}". This visitor does not hold ${cardName(alert.cardId)}, so nothing was sent.`
        : sent.rupeesPerYear === null
          ? `Approved and sent to this visitor's checkup, without a rupee figure.`
          : `Approved and sent to this visitor's checkup: ${sent.rupeesPerYear < 0 ? `costs about ${formatRs(-sent.rupeesPerYear)}` : `worth about ${formatRs(sent.rupeesPerYear)}`} a year on their spend.`,
    );
  };

  return (
    <article
      data-testid={`alert-${alert.id}`}
      className="space-y-4 border-t p-4"
    >
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {cardName(alert.cardId)} · feed date {alert.feedDate} · feed source:{" "}
          {alert.feedTier ?? "not stated"}
        </p>
        <p className="text-sm">Before: {alert.before ?? "not stated"}</p>
        <p className="text-sm">After: {alert.after ?? "not stated"}</p>
        {alert.feedUrl && (
          <a
            className="text-sm underline"
            href={alert.feedUrl}
            target="_blank"
            rel="noreferrer"
          >
            Source the feed points to
          </a>
        )}
      </div>
      <Field>
        <FieldLabel htmlFor={`url-${alert.id}`}>
          Bank&apos;s notice link
        </FieldLabel>
        <Input
          id={`url-${alert.id}`}
          type="url"
          placeholder="https://"
          value={issuerUrl}
          onChange={(e) => setIssuerUrl(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`tier-${alert.id}`}>Checked against</FieldLabel>
        <NativeSelect
          id={`tier-${alert.id}`}
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <NativeSelectOption value="official">
            The bank&apos;s own notice
          </NativeSelectOption>
          <NativeSelectOption value="press">
            A news report of the notice
          </NativeSelectOption>
          <NativeSelectOption value="other">
            Another public source
          </NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor={`kind-${alert.id}`}>Change to price</FieldLabel>
        <NativeSelect
          id={`kind-${alert.id}`}
          value={kind}
          onChange={(e) => setKind(e.target.value as Change["kind"])}
        >
          <NativeSelectOption value="other">
            Cannot be priced
          </NativeSelectOption>
          <NativeSelectOption value="fee">Annual fee change</NativeSelectOption>
          <NativeSelectOption value="rate">
            Reward rate change
          </NativeSelectOption>
        </NativeSelect>
      </Field>
      {kind === "rate" && (
        <Field>
          <FieldLabel htmlFor={`cat-${alert.id}`}>Category</FieldLabel>
          <NativeSelect
            id={`cat-${alert.id}`}
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
      )}
      {kind !== "other" && (
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`before-${alert.id}`}>
              {kind === "fee"
                ? "Annual fee before, in Rs"
                : "Rate before, in %"}
            </FieldLabel>
            <Input
              id={`before-${alert.id}`}
              type="number"
              min={0}
              step="any"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`after-${alert.id}`}>
              {kind === "fee" ? "Annual fee after, in Rs" : "Rate after, in %"}
            </FieldLabel>
            <Input
              id={`after-${alert.id}`}
              type="number"
              min={0}
              step="any"
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
          </Field>
        </div>
      )}
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
          aria-label="I opened the bank's notice and the before and after match"
        />
        <span>
          I opened the bank&apos;s notice and the before and after match.
        </span>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!checked || !issuerUrl || !priced}
          onClick={() => decide("approve")}
        >
          Approve and send
        </Button>
        <Button
          variant="outline"
          onClick={() => decide("reject")}
        >
          Reject
        </Button>
      </div>
    </article>
  );
}

type Feed = { source: "live" | "snapshot"; asOf: string; changes: Pending[] };

export function AdminScreen() {
  return <Gate>{(s) => <Console s={s} />}</Gate>;
}

// PRD Sec 10.1-10.2 in the prototype: the real public change feed, fetched now, waits here for review.
// A visitor's checkup in another tab updates the moment a change is approved.
function Console({ s }: { s: LocalState }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    fetch("/api/changes")
      .then((r) => (r.ok ? (r.json() as Promise<Feed>) : Promise.reject()))
      .then((f) => live && setFeed(f))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const heldIds = new Set(s.cards.map((c) => c.cardId));
  const waiting = (feed?.changes ?? [])
    .filter((c) => !s.decided.includes(c.id))
    .sort((a, b) => Number(heldIds.has(b.cardId)) - Number(heldIds.has(a.cardId)));

  return (
    <section className="space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          Founder console (prototype)
        </h1>
        <p className="text-muted-foreground">
          Bank rule changes from the public CardAdvisor change log, for the
          cards Clutch covers. Nothing reaches a cardholder until it is
          approved here. Open the bank&apos;s notice for each one first.
        </p>
        {feed && (
          <p className="text-sm text-muted-foreground">
            {feed.source === "live"
              ? `Live feed, as of ${feed.asOf}.`
              : `Could not reach the live feed; showing the saved copy from ${feed.asOf}.`}{" "}
            {waiting.length} waiting.
          </p>
        )}
      </div>
      {messages.map((m, i) => (
        <p
          key={i}
          role="status"
          className="rounded-md border-l-4 border-success bg-card p-3 text-sm"
        >
          {m}
        </p>
      ))}
      {!feed && !failed && (
        <p className="text-muted-foreground">Loading the change feed…</p>
      )}
      {failed && (
        <p className="text-destructive">The change feed did not load.</p>
      )}
      <div className="space-y-2">
        {waiting.map((a) => (
          <details
            key={a.id}
            className="rounded-xl border bg-card shadow-sm"
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <span className="text-xs text-muted-foreground">
                {a.feedDate} · {cardName(a.cardId)}
              </span>
              {heldIds.has(a.cardId) && (
                <Badge variant="secondary">Held by this visitor</Badge>
              )}
              <span className="w-full font-medium">{a.title}</span>
            </summary>
            <Review
              alert={a}
              onDone={(m) => setMessages((ms) => [...ms, m])}
            />
          </details>
        ))}
      </div>
    </section>
  );
}
