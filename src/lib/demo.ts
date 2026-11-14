import { impactOfChange } from "@/engine/impact";
import type { Change, HeldCard, SpendProfile } from "@/engine/types";
import { catalogue } from "./catalogue";
import type { UserAlert } from "./user-data";

// PRD Sec 3.3 demo mode: a made-up person holding three real catalogue cards. Spend and dates are
// examples, set relative to today so the timeline never goes stale. No network, no Firebase.

const DAY_MS = 86_400_000;
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const plusDays = (d: Date, n: number): Date =>
  new Date(d.getTime() + n * DAY_MS);

const card = (id: string) => {
  const c = catalogue.cards.find((x) => x.id === id);
  if (!c) throw new Error(`demo card missing from catalogue: ${id}`);
  return c;
};

// Real feed event (CardAdvisor changes.json, 15 May 2026), checked against HDFC's MoneyBack+ terms.
// Priced from the feed's words: 2 CashPoints per Rs 150 at 20 paise = 0.267%; per Rs 200 = 0.2%.
// The base rate applies to online spend outside the five 10X merchants.
const DEMO_CHANGE: Change = {
  kind: "rate",
  category: "online-shopping",
  beforePct: 0.267,
  afterPct: 0.2,
};

export type DemoUser = {
  held: HeldCard[];
  alerts: UserAlert[];
  profiles: Record<string, SpendProfile>; // each card's own monthly spend, for the verdict
  change: Change;
};

export function demoUser(today: Date): DemoUser {
  // Millennia renews in 100 days. Opened four years before that date (keeps 29 Feb valid).
  const renewal = plusDays(today, 100);
  const openedOn = `${renewal.getUTCFullYear() - 4}${iso(renewal).slice(4)}`;

  const held: HeldCard[] = [
    {
      cardId: "hdfc-moneyback-plus",
      card: card("hdfc-moneyback-plus"),
      pointsBalance: 3000,
      pointsExpireOn: iso(plusDays(today, 28)),
      statementDay: 18,
      dueDay: 7,
    },
    {
      cardId: "hdfc-millennia",
      card: card("hdfc-millennia"),
      last4: "4821",
      anniversaryMonth: renewal.getUTCMonth() + 1,
      openedOn,
      ytdSpendRs: 62000,
    },
    { cardId: "hdfc-tata-neu-infinity", card: card("hdfc-tata-neu-infinity") },
  ];

  const profiles: Record<string, SpendProfile> = {
    "hdfc-moneyback-plus": { "online-shopping": 15000, groceries: 5000 },
    "hdfc-millennia": { dining: 3000, other: 5000 },
    "hdfc-tata-neu-infinity": {
      groceries: 10000,
      utilities: 3000,
      other: 6000,
    },
  };

  const mbPlus = held[0];
  const alerts: UserAlert[] = [
    {
      alertId: "demo-hdfc-moneyback-plus-earn-rate",
      cardId: "hdfc-moneyback-plus",
      title: "Earn rate cut ~25%: per ₹150 raised to per ₹200",
      before: "20 CashPoints per ₹150 (10X); 2 per ₹150 (base)",
      after: "20 CashPoints per ₹200 (10X); 2 per ₹200 (base)",
      issuerUrl:
        "https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/credit-cards/moneyback-plus-credit-card/pdf/MBPlus-TnCs.pdf",
      rupeesPerYear: impactOfChange(
        mbPlus,
        DEMO_CHANGE,
        profiles["hdfc-moneyback-plus"],
      ).rupeesPerYear,
    },
  ];

  return { held, alerts, profiles, change: DEMO_CHANGE };
}
