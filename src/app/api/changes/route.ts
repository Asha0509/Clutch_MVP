import snapshot from "../../../../data/feed/snapshot.json";
import { catalogue } from "@/lib/catalogue";
import { alertsFromFeed } from "@/lib/feed";

const FEED_URL = "https://cardadvisor.in/data/changes.json";

// PRD Sec 10.1: the live public change feed, cut to the catalogue's cards. Every entry is pending; the
// Founder console decides what reaches a user. Falls back to the bundled snapshot when offline.
export async function GET(): Promise<Response> {
  const ids = new Set(catalogue.cards.map((c) => c.id));
  let feed: unknown = snapshot;
  let source: "live" | "snapshot" = "snapshot";
  try {
    const res = await fetch(FEED_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      feed = await res.json();
      source = "live";
    }
  } catch {}
  const asOf = (feed as { asOf?: unknown }).asOf?.toString() ?? snapshot.asOf;
  const changes = alertsFromFeed(feed, ids)
    .map(({ id, alert }) => ({ id, ...alert }))
    .sort((a, b) => b.feedDate.localeCompare(a.feedDate));
  return Response.json({ source, asOf, changes });
}
