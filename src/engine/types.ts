import { z } from "zod";

// Sec 7.1. Single source of truth for the card catalogue schema.
export const RewardRule = z.object({
  category: z.string(),
  ratePct: z.number().nonnegative(),
  monthlyCapRs: z.number().int().nonnegative().nullable(),
  capBasis: z.enum(["reward", "spend"]).nullable(),
  exclusions: z.array(z.string()),
  pointValuePaisa: z.number().nonnegative().nullable(),
});

export const Milestone = z.object({
  period: z.enum(["year", "quarter", "month", "anniversary-year"]),
  spendRs: z.number().int().nonnegative(),
  benefit: z.string(),
  benefitValueRs: z.number().int().nonnegative().nullable(),
});

export const Card = z.object({
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
  lounge: z.unknown().nullable(),
  upiOnCredit: z.unknown().nullable(),
  verified: z.object({ on: z.string(), sourceUrl: z.string().url() }),
});

export const Catalogue = z.object({
  version: z.string(),
  source: z.string(),
  cards: z.array(Card),
});

export type Card = z.infer<typeof Card>;
export type Catalogue = z.infer<typeof Catalogue>;
