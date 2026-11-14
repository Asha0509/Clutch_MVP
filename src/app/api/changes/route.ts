import snapshot from "../../../../data/feed/snapshot.json";
import { catalogue } from "@/lib/catalogue";
import { alertsFromFeed } from "@/lib/feed";

const FEED_URL = "https://cardadvisor.in/data/changes.json";
const HOUR_MS = 3_600_000;

// The feed publishes about once a day; one fetch an hour per server is plenty.
let live: { at: number; feed: unknown } | null = null;

async function liveFeed(now: number): Promise<unknown | null> {
  if (live && now - live.at < HOUR_MS) return live.feed;
  try {
    const res = await fetch(FEED_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    live = { at: now, feed: await res.json() };
    return live.feed;
  } catch {
    return null;
  }
}

// PRD Sec 10.1: the live public change feed, cut to the catalogue's cards. Every entry is pending; the
// Founder console decides what reaches a user. Falls back to the bundled snapshot when offline.
export async function GET(): Promise<Response> {
  const fetched = await liveFeed(Date.now());
  const feed = fetched ?? snapshot;
  const asOf = (feed as { asOf?: unknown }).asOf?.toString() ?? snapshot.asOf;
  const ids = new Set(catalogue.cards.map((c) => c.id));
  const changes = alertsFromFeed(feed, ids)
    .map(({ id, alert }) => ({ id, ...alert }))
    .sort((a, b) => b.feedDate.localeCompare(a.feedDate));
  return Response.json({
    source: fetched ? "live" : "snapshot",
    asOf,
    changes,
  });
}
