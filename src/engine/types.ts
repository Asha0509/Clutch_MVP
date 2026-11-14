import { z } from "zod";

// Sec 8.1. Reward categories; exclusions use the same names.
export const Category = z.enum([
  "dining",
  "groceries",
  "online-shopping",
  "travel-flights",
  "travel-hotels",
  "fuel",
  "utilities",
  "telecom",
  "insurance",
  "rent",
  "education",
  "wallet-load",
  "government",
  "entertainment",
  "other",
]);

// Sec 7.1. Single source of truth for the card catalogue schema.
export const RewardRule = z.object({
  category: Category,
  ratePct: z.number().nonnegative(),
  // Rupee cap per `capPeriod` (kept as monthlyCapRs to match Sec 7.1).
  monthlyCapRs: z.number().int().nonnegative().nullable(),
  capPeriod: z.enum(["month", "quarter"]).default("month"),
  capBasis: z.enum(["reward", "spend"]).nullable(),
  exclusions: z.array(Category),
  // Empty means the whole category; otherwise the rate applies only at these merchants.
  merchants: z.array(z.string()),
  pointValuePaisa: z.number().nonnegative().nullable(),
});

export const Milestone = z.object({
  period: z.enum(["year", "quarter", "month", "anniversary-year"]),
  spendRs: z.number().int().nonnegative(),
  benefit: z.string(),
  benefitValueRs: z.number().int().nonnegative().nullable(),
});

// Null counts mean the card has no access of that kind.
export const LoungeRule = z.object({
  domesticPerQuarter: z.number().int().nonnegative().nullable(),
  domesticPerYear: z.number().int().nonnegative().nullable().default(null),
  internationalPerYear: z.number().int().nonnegative().nullable(),
  spendGateRs: z.number().int().nonnegative().nullable(),
  gatePeriod: z.enum(["month", "quarter", "3-months"]).nullable(),
});

// Sec 8.3 rule 3. ratePct null means the base rate applies.
export const UpiRule = z.object({
  supported: z.boolean(),
  ratePct: z.number().nonnegative().nullable(),
  excluded: z.array(Category),
});

export const Card = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    issuer: z.string(),
    name: z.string(),
    network: z.enum(["VISA", "MASTERCARD", "RUPAY", "AMEX", "DINERS"]),
    joiningFeeRs: z.number().int().nonnegative(),
    annualFeeRs: z.number().int().nonnegative(),
    lifetimeFree: z.boolean(),
    feeWaiverSpendRs: z.number().int().nonnegative().nullable(),
    forexMarkupPct: z.number().nonnegative().nullable(),
    rewards: z.array(RewardRule),
    milestones: z.array(Milestone),
    // Months until points lapse, "never" if the issuer says they do not expire, null if unknown.
    // Engine must treat null as unknown, never as no expiry.
    pointsExpiryMonths: z
      .union([z.number().int().positive(), z.literal("never")])
      .nullable(),
    lounge: LoungeRule.nullable(),
    upiOnCredit: UpiRule.nullable(),
    verified: z.object({ on: z.iso.date(), sourceUrl: z.url() }),
  })
  .refine((c) => c.upiOnCredit === null || c.network === "RUPAY", {
    message: "UPI on credit is RuPay only",
    path: ["upiOnCredit"],
  });

export const Catalogue = z.object({
  version: z.string(),
  source: z.string(),
  cards: z
    .array(Card)
    .refine((cards) => new Set(cards.map((c) => c.id)).size === cards.length, {
      message: "duplicate card id",
    }),
});

export type Category = z.infer<typeof Category>;
export type RewardRule = z.infer<typeof RewardRule>;
export type Milestone = z.infer<typeof Milestone>;
export type LoungeRule = z.infer<typeof LoungeRule>;
export type UpiRule = z.infer<typeof UpiRule>;
export type Card = z.infer<typeof Card>;
export type Catalogue = z.infer<typeof Catalogue>;

// Sec 7.2 user card fields, plus the inputs the engine needs (Sec 8.2 deviations, build log 2026-11-14).
const IsoDate = z.iso.date();
const Rs = z.number().int().nonnegative();
const DayOfMonth = z.number().int().min(1).max(31);

export const UserCard = z.object({
  cardId: z.string(),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  openedOn: IsoDate.optional(),
  anniversaryMonth: z.number().int().min(1).max(12),
  feePaidOn: IsoDate.optional(),
  ytdSpendRs: Rs.optional(), // spend since the last card anniversary
  quarterSpendRs: Rs.optional(), // spend in the current calendar quarter
  monthSpendRs: Rs.optional(), // spend in the current calendar month
  pointsBalance: z.number().int().nonnegative().optional(),
  pointsExpireOn: IsoDate.optional(),
  statementDay: DayOfMonth.optional(),
  dueDay: DayOfMonth.optional(),
  capUsedRs: z.partialRecord(Category, Rs).optional(), // cap used so far this period, by category
  loungeVisitsPerYear: z.number().int().nonnegative().optional(),
  loungeValueRs: Rs.optional(), // user's own value per visit; the catalogue has none
});

export const SpendProfile = z.partialRecord(Category, Rs); // monthly rupees per category

export const Spend = z.object({
  category: Category,
  amountRs: Rs,
  channel: z.enum(["card", "upi", "online", "pos"]),
  merchant: z.string().optional(),
});

export type UserCard = z.infer<typeof UserCard>;
export type HeldCard = UserCard & { card: Card };
export type SpendProfile = z.infer<typeof SpendProfile>;
export type Spend = z.infer<typeof Spend>;

export type Ranked = {
  cardId: string;
  name: string;
  eligible: boolean;
  rewardRs: number;
  ratePct: number;
  reason: string;
  caveats: string[];
  bonus: { benefit: string; benefitValueRs: number | null } | null;
  timing: string | null;
};

export type WaiverProgress = {
  spentRs: number | null;
  targetRs: number;
  remainingRs: number | null;
  daysLeft: number;
  onTrack: boolean | null;
};

export type MilestoneStatus = {
  benefit: string;
  benefitValueRs: number | null;
  period: Milestone["period"];
  targetRs: number;
  spentRs: number | null;
  remainingRs: number | null;
  daysLeft: number;
  status: "done" | "on-track" | "behind" | "unknown";
};

export type Reminder = {
  cardId: string;
  kind: "expiring" | "unknown";
  daysLeft: number | null;
  tier: 60 | 30 | 7 | null;
  valueRs: number | null;
  text: string;
};

export type RiskItem = {
  cardId: string;
  kind: "points-expiry" | "fee" | "milestone";
  rupees: number;
  text: string;
};

export type Verdict = {
  decision: "keep" | "downgrade" | "close";
  reasons: string[];
  caveats: string[];
  netValueRs: number;
};

export type Change =
  | { kind: "rate"; category: Category; beforePct: number; afterPct: number }
  | { kind: "fee"; beforeRs: number; afterRs: number }
  | { kind: "other"; description: string };
