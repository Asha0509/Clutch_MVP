import { z } from "zod";

// One CardAdvisor change event (changes.json, PRD Sec 7.3). Only the fields we use; extra fields are ignored.
const FeedEvent = z.object({
  cardKey: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  date: z.iso.date(),
  type: z.string().min(1),
  before: z.string().nullish(),
  after: z.string().nullish(),
  direction: z.string().nullish(),
  verificationTier: z.string().nullish(),
  verificationUrl: z.string().nullish(),
  noticeId: z.string().nullish(),
});
const Feed = z.object({ events: z.array(z.unknown()) });

export type PendingAlert = {
  cardId: string;
  title: string;
  before: string | null;
  after: string | null;
  changeType: string;
  direction: string | null;
  feedDate: string;
  feedTier: string | null;
  feedUrl: string | null;
  noticeId: string | null;
  status: "pending";
};

// FNV-1a, so an event without a notice id still gets the same alert id every day.
const hash = (s: string): string => {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(36);
};
const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// PRD Sec 10.1: a feed entry is a trigger only. Every alert starts pending and waits for the Founder.
export function alertsFromFeed(
  raw: unknown,
  cardIds: Set<string>,
): { id: string; alert: PendingAlert }[] {
  const feed = Feed.safeParse(raw);
  if (!feed.success) return [];
  const seen = new Map<string, PendingAlert>();
  for (const item of feed.data.events) {
    const e = FeedEvent.safeParse(item);
    if (!e.success || !cardIds.has(e.data.cardKey)) continue;
    const ev = e.data;
    const id = `${ev.cardKey}-${ev.noticeId ? slug(ev.noticeId) : `${ev.date}-${hash(ev.title)}`}`;
    seen.set(id, {
      cardId: ev.cardKey,
      title: ev.title,
      before: ev.before ?? null,
      after: ev.after ?? null,
      changeType: ev.type,
      direction: ev.direction ?? null,
      feedDate: ev.date,
      feedTier: ev.verificationTier ?? null,
      feedUrl: ev.verificationUrl ?? null,
      noticeId: ev.noticeId ?? null,
      status: "pending",
    });
  }
  return [...seen].map(([id, alert]) => ({ id, alert }));
}
