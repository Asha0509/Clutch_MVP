import { describe, expect, it } from "vitest";
import { ApproveInput } from "../../functions/src/approve";
import { alertEmail } from "../../functions/src/email";

const facts = {
  cardName: "HDFC Millennia Credit Card",
  title: "Annual fee raised",
  before: "Rs 1,000 a year",
  after: "Rs 1,500 a year",
  issuerUrl: "https://www.hdfc.bank.in/credit-cards/millennia-credit-card",
  verificationTier: "official" as const,
  rupeesPerYear: -500,
};

describe("alertEmail (PRD Sec 10.4, Sec 2.4)", () => {
  it("states the change, the engine's figure and the bank's notice", () => {
    const { subject, text } = alertEmail(facts);
    expect(subject).toBe("HDFC Millennia Credit Card: Annual fee raised");
    expect(text).toContain("Before: Rs 1,000 a year");
    expect(text).toContain("After: Rs 1,500 a year");
    expect(text).toContain("about Rs 500 a year");
    expect(text).toContain(facts.issuerUrl);
  });

  it("says plainly when the change could not be priced", () => {
    expect(alertEmail({ ...facts, rupeesPerYear: null }).text).toContain("We could not put a rupee figure on this change.");
  });

  it("never carries an offer, a referral or a switch nudge", () => {
    const { subject, text } = alertEmail(facts);
    expect(`${subject} ${text}`).not.toMatch(/offer|apply|referral|switch|better card|instant|!/i);
  });

  it("contains no number that was not in its input", () => {
    const { text } = alertEmail(facts);
    const allowed = JSON.stringify(facts) + "500";
    for (const n of text.match(/\d[\d,.]*/g) ?? []) expect(allowed).toContain(n.replace(/[.,]$/, ""));
  });
});

describe("ApproveInput (PRD Sec 10.2)", () => {
  const approve = {
    alertId: "hdfc-millennia-x",
    decision: "approve",
    issuerUrl: "https://www.hdfc.bank.in/notice.pdf",
    verificationTier: "official",
    checked: true,
    change: { kind: "fee", beforeRs: 1000, afterRs: 1500 },
  };
  it("accepts an approval with an https notice, the check ticked and a priced change", () => {
    expect(ApproveInput.safeParse(approve).success).toBe(true);
  });
  it("refuses an approval without the check, without https, or with a bad change", () => {
    expect(ApproveInput.safeParse({ ...approve, checked: false }).success).toBe(false);
    expect(ApproveInput.safeParse({ ...approve, issuerUrl: "http://example.com" }).success).toBe(false);
    expect(ApproveInput.safeParse({ ...approve, change: { kind: "fee", beforeRs: -1, afterRs: 0 } }).success).toBe(false);
  });
  it("refuses a change whose before and after are the same", () => {
    expect(ApproveInput.safeParse({ ...approve, change: { kind: "fee", beforeRs: 1000, afterRs: 1000 } }).success).toBe(false);
    expect(
      ApproveInput.safeParse({ ...approve, change: { kind: "rate", category: "dining", beforePct: 1, afterPct: 1 } }).success,
    ).toBe(false);
  });
  it("lets an approved alert be resumed by id alone", () => {
    expect(ApproveInput.safeParse({ alertId: "a", decision: "resume" }).success).toBe(true);
  });
  it("needs only the id to reject", () => {
    expect(ApproveInput.safeParse({ alertId: "a", decision: "reject" }).success).toBe(true);
  });
});
