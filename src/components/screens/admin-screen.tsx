"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { Category, Change } from "@/engine/types";
import { catalogue } from "@/lib/catalogue";
import { db, functions } from "@/lib/firebase";
import { CATEGORY_LABELS } from "@/lib/labels";
import { useUser } from "@/lib/use-user";

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
type Result = {
  status: "approved" | "rejected";
  notified: number;
  emailed: number;
};

const approveAlert = httpsCallable<Record<string, unknown>, Result>(
  functions,
  "approveAlert",
);
const cardName = (id: string) =>
  catalogue.cards.find((c) => c.id === id)?.name ?? id;

// PRD Sec 10.2: open the bank's notice, confirm before and after, paste the notice link, set the tier,
// then approve or reject. The server checks the admin claim again (functions/src/index.ts).
function Review({
  alert,
  onDone,
}: {
  alert: Pending;
  onDone: (message: string) => void;
}) {
  const [issuerUrl, setIssuerUrl] = useState("");
  const [tier, setTier] = useState("official");
  const [kind, setKind] = useState<Change["kind"]>("other");
  const [category, setCategory] = useState<Category>("other");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setBusy(true);
    setError(null);
    const payload =
      decision === "reject"
        ? { alertId: alert.id, decision }
        : {
            alertId: alert.id,
            decision,
            issuerUrl,
            verificationTier: tier,
            checked,
            change: change(),
          };
    approveAlert(payload)
      .then(({ data }) =>
        onDone(
          data.status === "rejected"
            ? "Rejected. Nothing was sent."
            : `Approved. ${data.notified} ${data.notified === 1 ? "holder" : "holders"} told, ${data.emailed} ${data.emailed === 1 ? "email" : "emails"} sent.`,
        ),
      )
      .catch((e: { message?: string }) => {
        setError(e.message ?? "That did not go through.");
        setBusy(false);
      });
  };

  return (
    <article
      data-testid={`alert-${alert.id}`}
      className="space-y-4 rounded-lg border bg-card p-4"
    >
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {cardName(alert.cardId)} · feed date {alert.feedDate} · feed source:{" "}
          {alert.feedTier ?? "not stated"}
        </p>
        <h2 className="font-medium">{alert.title}</h2>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={busy || !checked || !issuerUrl || !priced}
          onClick={() => decide("approve")}
        >
          Approve and send
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => decide("reject")}
        >
          Reject
        </Button>
      </div>
    </article>
  );
}

export function AdminScreen() {
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<Pending[]>([]);
  const [approved, setApproved] = useState<Pending[]>([]);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    user
      .getIdTokenResult()
      .then((t) => live && setIsAdmin(t.claims.admin === true));
    return () => {
      live = false;
    };
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(
      query(collection(db, "alerts"), where("status", "==", "pending")),
      (snap) =>
        setAlerts(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Pending, "id">),
          })),
        ),
    );
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(
      query(collection(db, "alerts"), where("status", "==", "approved")),
      (snap) =>
        setApproved(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Pending, "id">),
          })),
        ),
    );
  }, [isAdmin]);

  if (user === undefined || (user && isAdmin === null))
    return <p className="py-10 text-muted-foreground">Loading…</p>;
  if (!user || !isAdmin) return <p className="py-10">Not available.</p>;

  return (
    <section className="space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Alerts waiting for review</h1>
        <p className="text-muted-foreground">
          Nothing reaches a cardholder until you approve it here. Open the
          bank&apos;s notice for each one first.
        </p>
      </div>
      {messages.map((m, i) => (
        <p
          key={i}
          className="rounded-md border-l-4 border-success bg-card p-3 text-sm"
        >
          {m}
        </p>
      ))}
      {alerts.length === 0 && (
        <p className="text-muted-foreground">No alerts are waiting.</p>
      )}
      {alerts.map((a) => (
        <Review
          key={a.id}
          alert={a}
          onDone={(m) => setMessages((ms) => [...ms, m])}
        />
      ))}
      {approved.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium">Approved</h2>
          <p className="text-sm text-muted-foreground">
            If sending stopped part-way, this finishes it. Nobody is emailed
            twice.
          </p>
          {approved.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm"
            >
              <span>
                {cardName(a.cardId)}: {a.title}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  approveAlert({ alertId: a.id, decision: "resume" })
                    .then(({ data }) =>
                      setMessages((ms) => [
                        ...ms,
                        `Finished. ${data.notified} more told, ${data.emailed} more emailed.`,
                      ]),
                    )
                    .catch((e: { message?: string }) =>
                      setMessages((ms) => [
                        ...ms,
                        e.message ?? "That did not go through.",
                      ]),
                    )
                }
              >
                Send to anyone missed
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
