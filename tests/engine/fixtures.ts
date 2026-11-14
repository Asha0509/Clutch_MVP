import { catalogue } from "@/lib/catalogue";
import type { Card, HeldCard, UserCard } from "@/engine/types";

// All engine tests run on 14 Nov 2026 (UTC) unless a test passes another day.
export const TODAY = new Date(Date.UTC(2026, 10, 14));
export const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

export function card(id: string): Card {
  const found = catalogue.cards.find((c) => c.id === id);
  if (!found) throw new Error(`fixture card not in catalogue: ${id}`);
  return found;
}

export function held(
  cardId: string,
  extra: Partial<Omit<UserCard, "cardId">> = {},
): HeldCard {
  return { cardId, anniversaryMonth: 1, ...extra, card: card(cardId) };
}

// Sec 8.5: ten synthetic users, each built from the shipped catalogue cards.
export const users = {
  cappedCategory: [
    held("hdfc-millennia", { capUsedRs: { "online-shopping": 900 } }),
  ],
  excludedCategory: [held("sbi-cashback"), held("icici-amazon-pay")],
  upiOnly: [held("hdfc-tata-neu-infinity"), held("hdfc-millennia")],
  nearMilestone: [held("hdfc-regalia-gold", { quarterSpendRs: 145000 })],
  expiringPoints: [
    held("hdfc-moneyback-plus", {
      pointsBalance: 3000,
      pointsExpireOn: "2026-12-04",
    }),
    held("hdfc-tata-neu-infinity", { pointsBalance: 500 }),
  ],
  waiverOnTrack: [
    held("hdfc-millennia", {
      anniversaryMonth: 3,
      openedOn: "2024-03-10",
      ytdSpendRs: 70000,
    }),
  ],
  waiverBehind: [
    held("hdfc-millennia", {
      anniversaryMonth: 3,
      openedOn: "2024-03-10",
      ytdSpendRs: 60000,
    }),
  ],
  tieBreak: [held("hdfc-tata-neu-plus"), held("axis-flipkart")],
  lifetimeFree: [held("icici-amazon-pay")],
  quarterlyCap: [
    held("axis-flipkart", { capUsedRs: { "online-shopping": 3800 } }),
  ],
} satisfies Record<string, HeldCard[]>;

export const allShipped = (): HeldCard[] =>
  catalogue.cards.map((c) => held(c.id));
