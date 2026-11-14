# Clutch investor demo

Two ways to show Clutch (PRD Sec 3.3, Sec 16.3). **The working prototype** is the main one: no sign-in, the investor can type their own cards, and every figure is computed live. **The guided demo** is the backup: five fixed screens with presenter notes that work with Wi-Fi off.

## Before the meeting (laptop)

1. Once: `pnpm install`
2. `pnpm build && pnpm start`, then open http://localhost:3000
3. Open the guided demo once so it works offline later.
4. Video: `pnpm demo:record` saves `demo-recording/clutch-demo.webm` (about 1 minute 20 seconds, no sound, paced for a voice-over). It walks the prototype below.

## Prototype talk track (about 2 minutes)

| Screen          | Do                                                                                                                | Say                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing         | Click **Try it with your cards**, answer the age question                                                         | No sign-in, no bank login, no card numbers. Your cards stay in this browser.                                                                                                        |
| My cards        | **Fill with an example** (or let the investor pick their own cards)                                               | Three real cards; the person and spend are examples. Every card fact is checked against the bank's own terms.                                                                       |
| Checkup         | Open **How we worked out Rs 1,600**                                                                               | Rs 1,600 at risk, and here is the arithmetic: 3,000 points × 20 paise, and a fee-waiver pace that ends near Rs 85,396, short of Rs 1,00,000. A rules engine, not a chatbot.         |
| Live change     | My cards, Millennia, **Add details**, spend so far 100000, save; back to Checkup                                  | Enter what you have actually spent and the figure moves: the fee is no longer at risk, Rs 600 is.                                                                                   |
| Pay with        | Rs 2,000, groceries, UPI                                                                                          | Only the RuPay credit card can take UPI. Switch to card and the ranking changes.                                                                                                    |
| Verdict         |                                                                                                                   | From this person's own month: Millennia costs about Rs 40 a year more than it gives back.                                                                                           |
| Founder console | Open the MoneyBack+ "Earn rate cut" row, choose reward rate, online shopping, 0.267 to 0.2, tick checked, approve | This is the live public log of card changes. Nothing reaches a user until I check it against the bank's notice. Approved, it is priced on this person's spend: about Rs 120 a year. |
| Checkup         |                                                                                                                   | It is on their checkup now, with the bank's notice. Open the checkup in a second tab before approving and it appears there without a reload. This is a pilot, and revenue is Rs 0.  |

## Guided demo talk track (backup, offline)

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
- **Privacy?** No bank login, no SMS or email reading, no card numbers. In the prototype nothing leaves the browser; the pilot records consent per purpose and it can be withdrawn.
- **Does AI make up the numbers?** No. Every rupee figure comes from a tested rules engine; the language model is never used for money.

## Do not say

Guaranteed savings; best card in India; instant or real-time alerts (the promise is within 72 hours of the bank's notice); RBI approved or bank partner; unbiased without the fee line; anything about credit scores or loans (PRD Sec 2.1).

## Built and parked

Built and shown: a working no-sign-in prototype on the visitor's own cards, catalogue of 9 verified cards, checkup with the engine's working, due-date and expiry reminders in the app, pay with (UPI on RuPay), verdict, the live change log with Founder approval, export and delete of the visitor's data, guided demo, offline install. Built but not deployed: the pilot backend (Google sign-in, Firestore rules, Cloud Functions, email).
Parked for after funding: push notifications, referral flow, statement upload, deployment, the other 21 cards.
