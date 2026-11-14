# Clutch investor demo

A 2-minute walk through demo mode (PRD Sec 3.3, Sec 16.3). The person in the demo is made up; the three cards, their rules and every rupee figure are real outputs of the rules engine on each bank's published terms.

## Before the meeting (laptop)

1. Once: `pnpm install`
2. `pnpm build && pnpm start`, then open http://localhost:3000
3. Click **See the 2-minute demo**. Each step has **Presenter notes** with the line to say.
4. After one full click-through the demo works with Wi-Fi off. Optional: in Chrome, use "Install Clutch" so it opens like an app, straight into the demo.

Recording a video: `pnpm demo:record` saves `demo-recording/clutch-demo.webm` (about 1 minute 15 seconds, no sound, paced for a voice-over).

## Talk track

| Time | Screen        | Say                                                                                                                                                                                                                                             |
| ---- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Landing       | Indians with two or more credit cards lose money quietly: fees that could have been waived, points that lapse, rules that change. Clutch reads each bank's published terms and says, in rupees, what to do.                                     |
| 0:15 | 1. Checkup    | Three real cards; the person and spend are examples. One screen: Rs 1,600 at risk, the Rs 600 of points about to lapse and a Rs 1,000 fee that can still be avoided.                                                                            |
| 0:40 | 2. A change   | A real change: HDFC cut the MoneyBack+ earn rate by about 25% from 15 May 2026. Clutch prices it on this person's spend, about Rs 120 a year, and links the bank's notice. Every alert is checked by hand against the notice before it is sent. |
| 1:00 | 3. Fee waiver | Rs 38,000 more in 100 days avoids the Rs 1,000 fee. The fee is charged at renewal; this shows the gap while there is still time.                                                                                                                |
| 1:20 | 4. Pay with   | Groceries, Rs 2,000, by UPI: only the RuPay card can take it. Switch to card to show it ranking live.                                                                                                                                           |
| 1:40 | 5. Verdict    | Once a year, from the person's own spend. Millennia costs about Rs 40 a year more than it gives back, so the advice is to ask HDFC about a lower-fee card. This is a pilot, and revenue is Rs 0.                                                |

## What each screen proves

- **Checkup:** the product turns scattered card terms into one rupee figure and the next action.
- **A change:** the data pipeline is real (a public change feed, checked against the bank's own document) and priced per person.
- **Fee waiver:** a concrete saving the user can still act on.
- **Pay with:** a reason to open the app weekly, including UPI on RuPay credit cards.
- **Verdict:** the moment a user may want a better card, which is where any future, labelled referral would sit.

## Honest answers to likely questions

- **Is the data real?** The 9 shipped cards are checked field by field against each bank's own terms (`data/catalogue/checklist.md`). The demo person and their spend are made up.
- **Users?** None yet. The plan is a 4-week pilot of 20 to 50 people (PRD Sec 12).
- **Revenue?** Rs 0 today. The hypothesis is labelled referral fees when a user chooses to look for a better card; partner terms are not yet confirmed.
- **Why not just CRED or CardAdvisor?** CardAdvisor publishes card data and alerts; Clutch works from the cards a person actually holds and their own spend, and prices each change for them.
- **Privacy?** No bank login, no SMS or email reading, no card numbers. Consent is recorded per purpose and can be withdrawn.
- **Does AI make up the numbers?** No. Every rupee figure comes from a tested rules engine; the language model is never used for money.

## Do not say

Guaranteed savings; best card in India; instant or real-time alerts (the promise is within 72 hours of the bank's notice); RBI approved or bank partner; unbiased without the fee line; anything about credit scores or loans (PRD Sec 2.1).

## Built and parked

Built and shown: catalogue of 9 verified cards, checkup, pay with, alert pipeline with Founder approval, verdict, demo mode, offline install.
Parked for after funding: reminders and push, referral flow, delete and export, statement upload, deployment, the other 21 cards.
