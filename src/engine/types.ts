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
  monthlyCapRs: z.number().int().nonnegative().nullable(),
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
  internationalPerYear: z.number().int().nonnegative().nullable(),
  spendGateRs: z.number().int().nonnegative().nullable(),
  gatePeriod: z.enum(["month", "quarter"]).nullable(),
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
    pointsExpiryMonths: z.number().int().positive().nullable(),
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
