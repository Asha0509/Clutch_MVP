import { impactLine } from "../../src/lib/alert-copy";
import type { VerificationTier } from "./approve";
import type { z } from "zod";

export type AlertFacts = {
  cardName: string;
  title: string;
  before: string | null;
  after: string | null;
  issuerUrl: string;
  verificationTier: z.infer<typeof VerificationTier>;
  rupeesPerYear: number | null; // from impactOfChange in src/engine, never computed here
};

const TIER: Record<AlertFacts["verificationTier"], string> = {
  official: "the bank's own notice",
  press: "a news report of the bank's notice",
  other: "a public source",
};

// PRD Sec 10.4: template first. Facts only; no offers, referrals or nudges to change card (Sec 2.4).
export function alertEmail(f: AlertFacts): { subject: string; text: string } {
  return {
    subject: `${f.cardName}: ${f.title}`,
    text: [
      `${f.cardName}: ${f.title}`,
      "",
      "What changed",
      `Before: ${f.before ?? "not stated"}`,
      `After: ${f.after ?? "not stated"}`,
      "",
      "What it means for you",
      impactLine(f.rupeesPerYear),
      "",
      `The bank's notice: ${f.issuerUrl}`,
      `Checked by Clutch against ${TIER[f.verificationTier]} before sending.`,
      "",
      "You get this email because you hold this card in Clutch and chose email alerts.",
    ].join("\n"),
  };
}
