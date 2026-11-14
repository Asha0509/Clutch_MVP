import { z } from "zod";
import { Change } from "../../src/engine/types";

// PRD Sec 10.2: the Founder confirms against the bank's own notice before anything is sent.
export const VerificationTier = z.enum(["official", "press", "other"]);

// A priced change must actually change something; this also stops a blank field arriving as 0.
const RealChange = Change.refine(
  (c) =>
    c.kind === "other" ||
    (c.kind === "fee" ? c.beforeRs !== c.afterRs : c.beforePct !== c.afterPct),
  { message: "Before and after must differ." },
);

export const ApproveInput = z.discriminatedUnion("decision", [
  z.object({ alertId: z.string().min(1), decision: z.literal("reject") }),
  // Finish sending an already approved alert to anyone it did not reach (for example after a timeout).
  z.object({ alertId: z.string().min(1), decision: z.literal("resume") }),
  z.object({
    alertId: z.string().min(1),
    decision: z.literal("approve"),
    issuerUrl: z.url().startsWith("https://"),
    verificationTier: VerificationTier,
    checked: z.literal(true),
    change: RealChange,
  }),
]);
export type ApproveInput = z.infer<typeof ApproveInput>;
