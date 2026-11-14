// PRD Sec 16.3: the 2-minute demo path. Presenter notes keep every spoken claim inside Sec 2.1.
export const DEMO_STEPS = [
  {
    slug: "checkup",
    title: "The checkup",
    say: "Three real cards with their real published rules; the person and their spend are made up. One screen shows Rs 1,600 at risk: points about to lapse and a fee that can still be avoided.",
  },
  {
    slug: "change",
    title: "A change to a card you hold",
    say: "A real change: HDFC cut the MoneyBack+ earn rate by about 25% from 15 May 2026. Clutch prices it on this person's own spend and links the bank's notice. Every alert is checked by hand against the notice before it is sent.",
  },
  {
    slug: "waiver",
    title: "The fee waiver",
    say: "The fee is charged at renewal. This shows the gap while there is still time: Rs 38,000 more in 100 days avoids a Rs 1,000 fee.",
  },
  {
    slug: "pay",
    title: "Which card to pay with",
    say: "At the till: groceries, Rs 2,000, by UPI. Only RuPay cards can take UPI, so Clutch shows which card works and what it earns. Change the inputs to show it live.",
  },
  {
    slug: "verdict",
    title: "Keep, downgrade or close",
    say: "Once a year, from the person's own spend. Millennia costs about Rs 40 a year more than it gives back, so the advice is to ask HDFC about a lower-fee card. Say plainly: this is a pilot, and revenue is Rs 0.",
  },
] as const;

export const AVOID =
  "Do not say: guaranteed savings, best card in India, instant or real-time alerts, RBI approved, or unbiased without the fee line.";
