import { useSyncExternalStore } from "react";
import { z } from "zod";
import { impactOfChange } from "@/engine/impact";
import { type Change, SpendProfile, UserCard } from "@/engine/types";
import { demoUser } from "./demo";
import { toHeld } from "./held";

// Prototype storage (Founder decision 2026-11-14): no sign-in, everything stays in this browser.
// Only an "is an adult" flag is kept, never the birth date (PRD Sec 6.1, data minimisation).

export const UserAlert = z.object({
  alertId: z.string(),
  cardId: z.string(),
  title: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  issuerUrl: z.string(),
  rupeesPerYear: z.number().int().nullable(),
  explanation: z.string().optional(),
});
export type UserAlert = z.infer<typeof UserAlert>;

const keepValid = <T>(schema: z.ZodType<T>) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((xs) =>
      xs.flatMap((x) => {
        const p = schema.safeParse(x);
        return p.success ? [p.data] : [];
      }),
    );

const State = z.object({
  adult: z.boolean().catch(false),
  cards: keepValid(UserCard),
  profiles: z.record(z.string(), SpendProfile).catch({}),
  alerts: keepValid(UserAlert),
  decided: z.array(z.string()).catch([]),
});
export type LocalState = z.infer<typeof State>;

export function parseState(raw: string | null): LocalState {
  let json: unknown = {};
  try {
    json = raw === null ? {} : JSON.parse(raw);
  } catch {}
  const p = State.safeParse(json && typeof json === "object" ? json : {});
  return p.success ? p.data : State.parse({});
}

export type PendingChange = {
  id: string;
  cardId: string;
  title: string;
  before: string | null;
  after: string | null;
};

// PRD Sec 10.2-10.3: once the Founder approves, the change is priced on the holder's own spend with the
// same engine, and reaches them once. A card they do not hold gets nothing.
export function approve(
  s: LocalState,
  p: PendingChange,
  input: { issuerUrl: string; change: Change },
): LocalState {
  const decided = s.decided.includes(p.id) ? s.decided : [...s.decided, p.id];
  const held = toHeld(s.cards).find((h) => h.cardId === p.cardId);
  if (!held || s.alerts.some((a) => a.alertId === p.id))
    return { ...s, decided };
  const { rupeesPerYear, explanation } = impactOfChange(
    held,
    input.change,
    s.profiles[p.cardId] ?? {},
  );
  const alert: UserAlert = {
    alertId: p.id,
    cardId: p.cardId,
    title: p.title,
    before: p.before,
    after: p.after,
    issuerUrl: input.issuerUrl,
    rupeesPerYear,
    explanation,
  };
  return { ...s, decided, alerts: [...s.alerts, alert] };
}

export const reject = (s: LocalState, id: string): LocalState =>
  s.decided.includes(id) ? s : { ...s, decided: [...s.decided, id] };

export function removeCardFrom(s: LocalState, cardId: string): LocalState {
  const profiles = { ...s.profiles };
  delete profiles[cardId];
  return {
    ...s,
    cards: s.cards.filter((c) => c.cardId !== cardId),
    profiles,
    alerts: s.alerts.filter((a) => a.cardId !== cardId),
  };
}

// The demo person's cards and spend, as a starting point the visitor can then edit. Alerts start empty:
// they arrive only when a change is approved in the Founder console.
export function exampleState(today: Date): LocalState {
  const demo = demoUser(today);
  return {
    adult: true,
    cards: demo.held.map((h) => UserCard.parse(h)), // zod drops the joined catalogue card
    profiles: demo.profiles,
    alerts: [],
    decided: [],
  };
}

// --- Browser binding: one key in localStorage, shared across tabs through the storage event. ---

const KEY = "clutch.prototype.v1";
let raw: string | null | undefined; // undefined until first read
let snap: { raw: string | null; state: LocalState } | undefined;
const listeners = new Set<() => void>();

function read(): LocalState {
  if (raw === undefined) {
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      raw = null;
    }
  }
  if (!snap || snap.raw !== raw) snap = { raw, state: parseState(raw) };
  return snap.state;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    raw = e.key === null ? null : e.newValue;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// If storage is blocked (private window), changes still work for this tab, in memory.
export function update(fn: (s: LocalState) => LocalState): void {
  raw = JSON.stringify(fn(read()));
  try {
    localStorage.setItem(KEY, raw);
  } catch {}
  listeners.forEach((l) => l());
}

export const clearAll = (): void => update(() => parseState(null));

// null during server rendering and the first client render, so the page never flashes stale data.
export const useLocalStore = (): LocalState | null =>
  useSyncExternalStore(subscribe, read, () => null);
