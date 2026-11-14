# Clutch MVP: Product Requirements Document

Version 1.0 · 14 November 2026 · Author: Asha Jyothi Boddu (Founder)
Status: ready to build. Read Sec 1 to 3 first. Everything else is reference.

Section numbers are cited in code comments and commits as "Sec N" (ASCII).

---

## Sec 1. What Clutch is

Clutch is an honest friend for your credit cards. An Indian cardholder tells Clutch which cards they hold. Clutch tells them, in rupees, what is quietly leaking: a renewal fee they will pay on an idle card, a fee waiver they are Rs 8,000 short of, points about to expire, a bank that just cut a benefit on a card they hold. It also says which card to pay with, and once a year whether to keep, downgrade or close each card.

Clutch does not issue cards, lend, or move money. That is the whole point: it can say "drop this card" because it earns nothing from you keeping it.

One line for the pitch: **Your cards owe you money. We collect.**

### 1.1 Who it is for

- First user: salaried, 24 to 40, metro, holds 2 to 5 credit cards, has already been burned by a fee or a benefit cut.
- Early adopters: people who read TechnoFino and r/CreditCardsIndia.
- Market context (cited, not claimed as a forecast): about 5.2 crore cardholders, 22% hold three or more cards (CIBIL, March 2026).

### 1.2 What the MVP is for

The MVP exists to buy evidence, for three audiences, and must be built so each can be shown without a live bank connection:

1. **Users** (20 to 50 pilot users): do they come back, do they act on alerts, would they pay.
2. **Google Startup Buildathon India 2026**: a working Gemini plus Google Cloud product that can be demoed offline in 2 minutes.
3. **Draper University and other programmes**: a founder-built product with real pilot numbers, not a deck alone.

### 1.3 Honest status of the idea

The research (see docs/research-summary.md) says: conditional go as a lean product, not yet venture-scale. No tracking-and-alerts analogue has reached venture scale. CardAdvisor offers free alerts for fee and reward changes. CRED is the incumbent. Clutch's bet is personal alerts on cards you actually hold, with rupee impact, plus fee-waiver and milestone tracking, plus a trusted keep or close verdict. These are bets, not facts. Pilot gates in Sec 12 decide whether to continue.

---

## Sec 2. Hard constraints

These override every other section. If a task conflicts, stop and ask the Founder.

1. **No sensitive card data.** Store card product, issuer, and optionally the last four digits. Never the full number, expiry, CVV, PIN, OTP, or net-banking credentials. RBI's circular on card data storage permits last four digits and issuer name.
2. **No bank logins, no SMS reading, no Gmail reading, no Account Aggregator** in the MVP. Ingestion is manual card selection, plus optional statement PDF parsed in the browser (Sec 7.5).
3. **LLM never computes money.** Every rupee figure comes from the deterministic rules engine (Sec 8). Gemini may only (a) extract structured fields from user text or a statement, and (b) word an alert whose facts are already computed. If the model's output contains a number not present in its input, discard it and use the template text.
4. **Alerts carry no offers.** A rule-change alert never includes a referral, a sponsored card, or a "switch" nudge. Referrals appear only in a user-initiated flow (Sec 9).
5. **Ranking never uses payout.** Referral ordering depends only on fit to the user's stated spend. Payout must not be an input to any sort, score or filter. The fee, if any, is shown on screen next to the recommendation.
6. **Human approval before any rule-change alert is sent.** A change feed entry is a trigger, not a source of truth. Confirm against the issuer notice, record the link, then approve.
7. **Every number shown has a source.** Alerts link the issuer notice. Card facts show "verified on <date>".
8. **Secrets stay out of the repo and out of the model's reach.** `.env*` is denied in `.claude/settings.json`. Keys live in Firebase secrets and local `.env.local`.
9. **Gemini on the paid tier for any user data.** Free-tier content may be used to improve Google products. Synthetic data only on the free tier.

### 2.1 Claims Clutch never makes

- "Guaranteed savings" or any specific rupee saving before the user's own data is entered.
- "Best card in India" or any universal ranking. Only "best of the cards you hold" and "best fit for the spend you told us".
- "RBI approved", "RBI registered", "bank partner" or any regulator or bank endorsement.
- "We never earn from cards." True statement: "When we earn a fee for a card you choose to apply for, we show it."
- "Unbiased" without the fee line next to it.
- "Instant" or "real-time" for alerts. Say "within 72 hours of the bank's notice".
- Any credit score, credit advice, or loan eligibility claim.

---

## Sec 3. MVP scope

### 3.1 In scope (build order is Sec 13)

| ID | Feature | One-line description |
|---|---|---|
| F1 | Sign-in | Google sign-in (Firebase Auth). No password, no phone OTP. |
| F2 | My cards | Pick held cards from the catalogue. Optional last four digits, anniversary month, annual fee paid date. |
| F3 | Card checkup | One screen: total rupees at risk across cards, and the top 3 fixes. |
| F4 | Rule-change alerts | Approved changes to a card the user holds, with rupee impact and issuer link. Email plus web push. |
| F5 | Renewal and waiver guard | Renewal date, fee, waiver threshold, spend so far, progress bar, and "Rs X more by DATE". |
| F6 | Milestones and lounge tracker | Spend milestones and quarterly lounge gates as progress bars. |
| F7 | Points expiry | Balance and expiry date entered by the user; reminders at 60, 30 and 7 days. |
| F8 | Best card to pay with | Pick a category or amount, get the best of held cards, with the reason and the caps. UPI-on-RuPay logic included. |
| F9 | Keep, downgrade or close verdict | Once a year per card, from the user's own spend. |
| F10 | Due-date calendar | Statement and due dates, reminders 5, 2 and 0 days before. Not an EMI or bills view. |
| F11 | Find a better card (referral) | User-initiated only. Labelled. Fee shown. Neutrality rules in Sec 9. |
| F12 | Privacy and consent | Notice, granular consent, consent log, withdrawal, export, delete. |
| F13 | Admin console | Founder-only page: review change feed, approve alerts, edit card data, see pilot metrics. |

### 3.2 Explicitly out of scope

Bills and EMI tracker, loans, credit score, Gmail or SMS or AA ingestion, WhatsApp alerts, browser extension, offer aggregation, native iOS or Android apps, payments of any kind, subscriptions billing, family or add-on card views, forex comparison, B2B API. Each is a later bet with a trigger in Sec 14.

### 3.3 Demo mode

A button on the landing page loads a synthetic user with three cards and a prepared timeline (a cut, a waiver at 62%, points expiring in 28 days). It runs with no network and no LLM. The Buildathon demo and any investor demo use this mode. Live mode is opt-in.

---

## Sec 4. User journeys (MVP)

1. **First run.** Landing page → "Check my cards" → Google sign-in → consent screen (Sec 11) → pick cards → checkup screen with rupees at risk. Target: under 3 minutes, under 6 taps for 3 cards.
2. **Alert.** Founder approves a change → matching users get an email and a web push → tap opens the card page with before and after, rupee impact for this user, and the issuer link.
3. **Before a purchase.** Open "Pay with" → choose category and amount → see best held card, runner-up, reason, caps, "UPI works on this card" flag.
4. **Renewal season.** 45 days before renewal: reminder with fee, waiver progress, and the verdict. If verdict is "close" or "downgrade", a plain line: "Want to see cards that fit your spend?" which opens F11.
5. **Delete me.** Settings → delete account → confirmation → all user documents deleted, consent log retained as a stripped record (Sec 11.4).

---

## Sec 5. Architecture

```
Browser (Next.js PWA, installable, service worker for push)
   │  Firebase Auth (Google)         static catalogue.json (versioned, in bundle)
   │                                  rules engine (pure TS, runs in browser and functions)
   ▼
Firestore (users, userCards, consents, alerts, events)
   ▲
Cloud Functions (2nd gen)
   ├─ ingestChangeFeed  (scheduled, daily): pull CardAdvisor changes.json, write pending alerts
   ├─ approveAlert      (callable, admin only): mark approved, fan out
   ├─ sendReminders     (scheduled, daily): expiry, waiver, due dates
   ├─ geminiExtract     (callable): text or statement → structured fields (Sec 7.5)
   └─ deleteMyData      (callable): erase user documents
Email: Resend or Brevo.  Push: Firebase Cloud Messaging web push.
Hosting: Firebase App Hosting (or Hosting + Functions).  Plan: Blaze with budget alert.
```

Principles:

- **Static catalogue, not a database read.** `data/catalogue/catalogue.json` ships in the bundle. 30 documents per session would waste Firestore reads. Updated by pull request.
- **One engine, two places.** The rules engine is a pure TypeScript package with no network access. It runs in the browser for instant answers and in functions for reminders. Same tests cover both.
- **Gemini behind a callable function**, never from the browser, so the key stays server-side and every call can be logged.
- **Demo mode needs nothing.** Fixtures and engine only.

### 5.1 Repository layout

```
CLAUDE.md
setup.sh
docs/prd.md
docs/build-log.md          failures and fixes, append only
docs/research-summary.md   verdict and sources
src/app/                   Next.js App Router pages
src/components/            shadcn/ui and app components
src/engine/                pure rules engine (no I/O)
src/lib/                   firebase client, consent, formatting
functions/                 Cloud Functions
data/catalogue/            catalogue.json, schema, attribution
data/fixtures/             synthetic users and statements
tests/                     vitest unit, playwright e2e
logs/                      JSONL run logs (gitignored except .gitkeep)
.claude/                   settings, rules, agents
```

---

## Sec 6. Login and auth design

> **Prototype note (Founder decision, 14 Nov 2026):** the investor prototype has no sign-in. Data stays in the visitor's browser, the age check still runs first, and the Founder console approves changes into that browser. The design below is the production plan for the pilot.

This is the "what kind of logins" answer. Keep it boring.

### 6.1 For users

- **Google sign-in only**, through Firebase Auth. Reasons: fastest for a 3-minute first run, works on every phone, no OTP SMS cost, no password to leak. Phone OTP is avoided because of SMS cost and DLT registration.
- Request only `openid`, `email`, `profile`. No Gmail, Drive or other scopes. Requesting Gmail read scope would trigger Google's restricted-scope security assessment.
- Sessions use Firebase ID tokens, verified in every callable function (`context.auth` must be present).
- Under-18 users: ask birth year and month after sign-in (Founder decision, 2026-11-14). The month of the 18th birthday counts as under 18. If under 18, show an "ask a parent" screen and do not create a profile (DPDP parental consent, Sec 11). Firestore rules enforce this.

### 6.2 For the Founder (admin)

- Same Google sign-in, plus a custom claim `admin: true` set once from a local script using the Firebase Admin SDK (`scripts/make-admin.ts`, takes the UID as an argument).
- Admin routes check the claim on the server. Firestore rules deny all admin collections to non-admins.
- Enable multi-factor on the Founder's Google account. No shared accounts.

### 6.3 For Claude Code and developers

- Claude Code never needs production credentials. Work happens against the Firebase **emulator suite** (Auth, Firestore, Functions) with `firebase emulators:start`. The setup script does not log in to anything.
- The Founder runs `firebase login` and `gcloud auth login` by hand, once, for deploys. Claude Code must not run `firebase deploy` without being asked in that message.
- GitHub: use the `gh` CLI authenticated by the Founder. Commits use the Founder's own git identity (see CLAUDE.md).
- Service accounts: one for Functions at runtime (default), none exported to disk. If a key file is ever needed, it goes in `secrets/` which is gitignored and denied to Claude Code.

### 6.4 Firestore security rules (principles)

- `users/{uid}` and everything under it: read and write only when `request.auth.uid == uid`.
- `catalogue` is not in Firestore (static file).
- `alerts` (approved): read by users who hold the affected card via a per-user fan-out document `users/{uid}/alerts/{id}`; pending alerts are admin-only.
- `consents/{uid}/log/{id}`: create allowed for the owner, no update, no delete by the client.
- Rules tests run in the emulator (Sec 13, step 2).

---

## Sec 7. Data

### 7.1 Card catalogue

Source: CardAdvisor bulk dataset `cards.json` (280 cards, CC BY 4.0, attribution and link required, retrieved from cardadvisor.in/data). Use the frozen release (latest noted: v2026-09-17) for reproducibility. Ratings, valuations and editorial text are not covered by the licence; do not copy them.

Launch set: 25 to 30 cards chosen by the Founder (top by issuance and by pilot user holdings). For these, hand-verify against the issuer's MITC and benefit pages, and add what the open dataset lacks: **milestones, points expiry rules, lounge gates, UPI eligibility**. Record `verifiedOn` and `sourceUrl` per field group. Ship an attribution line in the app footer and in `data/catalogue/ATTRIBUTION.md`.

Schema (TypeScript, zod validated; the file `src/engine/types.ts` is the single source):

```ts
type Card = {
  id: string;                    // "hdfc-regalia-gold"
  issuer: string;
  name: string;
  network: "VISA" | "MASTERCARD" | "RUPAY" | "AMEX" | "DINERS";
  joiningFeeRs: number;
  annualFeeRs: number;
  lifetimeFree: boolean;
  feeWaiverSpendRs: number | null;       // annual spend that waives next year's fee
  forexMarkupPct: number | null;
  rewards: RewardRule[];
  milestones: Milestone[];               // hand-curated
  pointsExpiryMonths: number | "never" | null; // hand-curated; "never" = issuer says no expiry; null = unknown
  lounge: LoungeRule | null;             // hand-curated
  upiOnCredit: UpiRule | null;           // hand-curated (RuPay)
  verified: { on: string; sourceUrl: string };   // ISO date
};

type Category = "dining" | "groceries" | /* ... the Sec 8.1 list */ "other";

type RewardRule = {
  category: Category;                    // Sec 8.1
  ratePct: number;                       // effective value, after point value
  monthlyCapRs: number | null;           // cap per capPeriod, on reward value or on spend (see capBasis)
  capPeriod: "month" | "quarter";        // default "month"
  capBasis: "reward" | "spend" | null;
  exclusions: Category[];                // e.g. "rent", "wallet-load", "fuel", "government"
  merchants: string[];                   // empty = whole category; else only at these merchants
  pointValuePaisa: number | null;
};

type Milestone = {
  period: "year" | "quarter" | "month" | "anniversary-year";
  spendRs: number;
  benefit: string;                       // plain text
  benefitValueRs: number | null;
};

type LoungeRule = {
  domesticPerQuarter: number | null;
  domesticPerYear: number | null;
  internationalPerYear: number | null;
  spendGateRs: number | null;            // spend needed to unlock the visits
  gatePeriod: "month" | "quarter" | "3-months" | null;
};

type UpiRule = {
  supported: boolean;                    // RuPay cards only
  ratePct: number | null;                // null = base rate applies
  excluded: Category[];
};
```

### 7.2 Firestore collections

| Path | Fields | Notes |
|---|---|---|
| `users/{uid}` | createdAt, displayName, email, dobYear, dobMonth, locale, spendProfile? (monthly Rs by category) | email only for sending alerts |
| `users/{uid}/cards/{id}` | cardId, last4?, openedOn?, anniversaryMonth? (fee month; unlocks waiver tracking), feePaidOn?, ytdSpendRs?, quarterSpendRs?, monthSpendRs?, pointsBalance?, pointsExpireOn?, statementDay?, dueDay?, capUsedRs? (by category), loungeVisitsPerYear?, loungeValueRs? | all user entered; the last five feed the engine (Sec 8.2) |
| `users/{uid}/alerts/{id}` | alertId, cardId, readAt?, sentVia[] | fan-out copy |
| `users/{uid}/events/{id}` | type, at, meta | product analytics, own data only |
| `alerts/{id}` (admin) | cardId, changeType, before, after, issuerUrl, verification, status (pending, approved, rejected), approvedBy, approvedAt | |
| `consents/{uid}/log/{id}` | purpose, granted, noticeVersion, at, userAgentHash | append only |

### 7.3 Change feed

CardAdvisor publishes 1,800 dated events across 280 cards (`changes.json`, RSS, iCalendar), with before and after values and a verification tier. A bank-wide revision appears once per affected card. Pipeline in Sec 10.

### 7.4 Data freshness promise

"Within 72 hours of the bank's notice, for the 25 to 30 cards we cover." The admin console shows the age of every card's `verified.on` and flags any older than 90 days.

### 7.5 Statement upload (optional, built last)

- User picks a PDF; it is parsed **in the browser**. Password is typed by the user and never sent anywhere. The raw PDF never leaves the device.
- Only structured fields leave the device, after the user confirms them on screen: statement date, due date, total due, reward points, per-category totals.
- Reference parsers for fixtures: cc-parser (MIT) and stmtforge (MIT) support many Indian issuers. They are Python; in-browser use needs a JS or Pyodide path. Verify feasibility in week 3 before committing; fall back to manual entry of the same fields.
- Gemini may be used by a callable only to map messy statement text to the structured fields, on the paid tier, with the user's confirmation step before saving.

---

## Sec 8. Rules engine

Pure functions, no I/O, no clock reads (time is passed in). 100% of money logic. Lives in `src/engine/`.

### 8.1 Categories

`dining, groceries, online-shopping, travel-flights, travel-hotels, fuel, utilities, telecom, insurance, rent, education, wallet-load, government, entertainment, other`. Exclusions use the same names.

### 8.2 Functions

```ts
// Approved 2026-11-14: verdict, bestCard and impactOfChange take the extra inputs they need (build log).
bestCard(held: HeldCard[], spend: {category, amountRs, channel: "card"|"upi"|"online"|"pos", merchant?}, today: Date): Ranked[]
checkup(held: HeldCard[], today: Date): { atRiskRs: number; items: RiskItem[]; top3: RiskItem[] }
waiverProgress(card: HeldCard, today: Date): { spentRs, targetRs, remainingRs, daysLeft, onTrack: boolean | null } | null
milestoneProgress(card: HeldCard, today: Date): MilestoneStatus[]
expiryReminders(held: HeldCard[], today: Date): Reminder[]
verdict(card: HeldCard, held: HeldCard[], catalogue: Card[], profile: SpendProfile, today: Date): { decision: "keep"|"downgrade"|"close"; reasons: string[]; caveats: string[]; netValueRs: number }
impactOfChange(card: HeldCard, change: Change, profile: SpendProfile): { rupeesPerYear: number | null; explanation: string }
```

### 8.3 bestCard rules

1. For each held card, find the reward rule for the category. If `exclusions` contains the category, effective rate is 0.
2. Effective reward = amount × `ratePct`, then apply `monthlyCapRs` according to `capBasis`. Cap usage so far is user-entered or zero (state this on screen).
3. Channel `upi`: only cards with `upiOnCredit.supported` and the category not in `upiOnCredit.excluded` can be used; apply `upiOnCredit.ratePct` if set, else the base rate. Flag small-ticket UPI exclusions.
4. If the amount would cross a milestone threshold this period, add the milestone's `benefitValueRs` as a "bonus if you complete it" line, never into the base ranking (keep ranking explainable).
5. Billing-date timing: if today is within 3 days after the card's statement day, note "about 50 days to repay" else show days to due date.
6. Tie-break: lower annual fee, then card id alphabetical. Deterministic.
7. Output always includes `reason` as a plain sentence and `caveats` as a list.

### 8.4 verdict rules

Net value = (annual reward value from user's spend) + (milestone benefits actually hit) + (lounge value, if user uses lounges) − annual fee (after waiver if on track).

- `keep` if net value ≥ 0 and positive after next-year fee.
- `downgrade` if net value < 0 and a lower-fee variant of the same issuer exists in the catalogue.
- `close` if net value < 0, no variant exists, and the card is not the user's oldest card (credit history note shown as a caveat, not hidden).

Values the user has not entered (e.g. lounge use) default to 0 and the screen says "not counted".

### 8.5 Tests

- Table-driven unit tests per function, with the numbers worked by hand in comments.
- A fixture set of 10 synthetic users covering: capped category, excluded category, UPI-only, near-milestone, expiring points, fee-waiver on track and behind, tie-break.
- Property test: reward never negative; ranking is stable under input order.

---

## Sec 9. Referral and neutrality rules

Revenue hypothesis: labelled card referral fees, Rs 375 to 3,037 per approved card (range from the lean canvas; verify against actual partner terms before quoting). Revenue today: Rs 0.

Rules (also enforced by tests):

1. F11 is reached only by the user tapping "Find a better card". Never by an alert, a push, an email, a banner or an interstitial.
2. Candidate cards are filtered by the user's stated spend profile and eligibility inputs. Order is by `fitScore` (engine function), which takes no payout or partner status as input. A unit test fails the build if `fitScore` imports anything from `referral/`.
3. Every card shown has a label: "Ad: we may earn a fee if you apply" or "We earn nothing if you apply", whichever is true, in text at least 14px next to the card, not in a footer.
4. Cards with no referral partner appear alongside partner cards on equal terms.
5. Consent for any marketing communication defaults to **No** and is a separate toggle.
6. No countdown timers, no "only 2 left", no pre-ticked boxes, no hidden cancel. (The CCPA dark-pattern guidelines and the RBI sales-practices directions list such patterns.)
7. Clutch never submits an application. It links out to the issuer or partner page.
8. Store a record of every outbound click: user, card, label shown, time. Retain one year after the last interaction.

Open legal question (Sec 15): whether the RBI directions that take effect 1 January 2027 apply to Clutch as a bank's "engaged" partner. If yes, the referral flow needs the bank's code of conduct, a written undertaking and consent records. A lawyer decides; build the consent log so it is possible either way.

---

## Sec 10. Alert pipeline

1. `ingestChangeFeed` (daily, 06:00 IST): fetch the live CardAdvisor `changes.json` (Founder decision, 2026-11-14; URL set by the `FEED_URL` parameter). For each new event on a catalogue card, write `alerts/{id}` with status `pending`. Demo mode does not depend on it.
2. Founder opens the admin console. For each pending alert: open the issuer notice, confirm the before and after values, paste the issuer URL, set verification tier, then approve or reject.
3. `approveAlert`: for every user holding the card, compute `impactOfChange` using the engine, create `users/{uid}/alerts/{id}`, send email and web push.
4. Wording: template first. Gemini may rephrase the template only if the facts are passed in and its output passes the "no new numbers" check (Sec 2.3).
5. Reminders (`sendReminders`, daily 08:00 IST): expiry at 60/30/7 days, waiver behind pace at 90 and 30 days before renewal, due dates at 5/2/0 days, milestone gap when under 20% of period left.
6. Limits: at most 1 alert push per user per day; digest the rest in email. Quiet hours 21:00 to 08:00 IST.
7. Email is the guaranteed channel. Web push is best effort (iOS needs 16.4 or later and an installed PWA).
8. Every send is logged to `logs/` as JSONL with: user hash, alert id, channel, result.

---

## Sec 11. Privacy, consent and compliance

### 11.1 Law today and what is coming

- Until the DPDP Act's operative provisions start (about 12 to 14 May 2027), the IT Act section 43A and the 2011 SPDI Rules apply: publish a privacy policy, keep reasonable security practices.
- Build to the DPDP standard now: itemised notice before consent, consent withdrawable as easily as given, one-year retention of consent and processing logs, breach notice within 72 hours, grievance response within 90 days, verifiable parental consent for under 18.

### 11.2 Consent purposes (each a separate toggle, default off except the first)

1. `core` (on, required): store my cards and numbers to run Clutch.
2. `alerts_email`: send me alerts by email.
3. `alerts_push`: send me alerts by push.
4. `marketing`: tell me about card offers. **Default No.**
5. `ai_processing`: use Gemini to read text or statements I paste. Off until the user uses that feature.

### 11.3 Notice

A one-screen notice before first data entry: what we store, why, who sees it (Founder, Google Cloud, email provider), how long, how to delete, grievance contact. Versioned (`noticeVersion`); a change re-asks consent.

### 11.4 Retention and deletion

- Delete account removes `users/{uid}` and subcollections. A stripped consent record (purpose, time, notice version, no identity) is retained for one year.
- Export: JSON download of the user's own documents.

### 11.5 Other checklists

- RBI card-data circular: only product, issuer, optional last four digits stored.
- RBI/2026-27/115 sales-practices directions, effective 1 January 2027: default-"No" consent, 11 dark patterns banned, consent records kept one year after the contract. Applicability to Clutch is unconfirmed (lawyer).
- CCPA dark-pattern guidelines: ads disclosed as ads.
- Google Play (only if a store listing is made later): Financial features declaration; no SMS permission. The MVP is a PWA outside the store.
- Name: IP India trademark search for "Clutch" in classes 9, 36, 42 before any paid marketing.
- Disclaimer shown in app: "Clutch gives information, not financial advice. Check the bank's own terms."

---

## Sec 12. Metrics and pilot pass marks

Pilot: 20 to 50 people, 4 weeks, recruited from TechnoFino, r/CreditCardsIndia, the Founder's network.

| Metric | How measured | Pass mark |
|---|---|---|
| Activation | users who add 2+ cards and reach checkup within first session | 60%+ |
| Weekly checks | "Pay with" or checkup opens per active user per week | 3+ |
| Day-30 retention | active on day 28 to 32 | 15%+ |
| Alert action | alerts opened and card page viewed within 48h | 25%+ |
| Rupees flagged | median `atRiskRs` per user | Rs 500+ per year |
| Concierge test (before build) | 20 people get a hand-made checkup and alerts for 4 weeks | 12+ say they would be upset to lose it |
| Paid price test | tap-through on Rs 99 to 199 a year pay screen (no payment taken) | 10%+ of active users |
| Verdict-to-referral | verdict viewers who tap "Find a better card" | 15%+, zero neutrality complaints |
| Neutrality | share of recommendations that earn Clutch Rs 0 | reported, no target |

These are targets the Founder set, not benchmarks. A 13.2% Day-30 retention figure from an earlier report is the comparison used; the source was not rechecked in this pass.

If concierge fails, stop and write up what was learned. If the paid or referral gates fail but retention passes, the product is a free tool with no revenue and needs a new model.

Analytics: own events collection only (no third-party trackers in the MVP).

---

## Sec 13. Build order and acceptance criteria

> **Status, 14 Nov 2026 (prototype):** steps 1, 3, 4, 5, 6 (approval in the browser; email path built in `functions/`), 8 without the referral flow, 9, and 10's export and delete (browser data) are done. Step 7 is in-app only (due-date and expiry reminders on the checkup, no push). Steps 2 and 12 are built or parked as the production path. Step 11 is not started.

Target: 3 to 4 weeks, one developer (the Founder with Claude Code). Each step ends with tests green and a build-log entry.

| Step | Deliverable | Done when |
|---|---|---|
| 0 | Run `setup.sh`; app boots; emulators start; CI green | `pnpm dev` shows the landing page; `pnpm test` passes |
| 1 | Catalogue: schema, loader, 25 to 30 cards verified | zod validation passes; every card has `verified.on` and `sourceUrl`; attribution present |
| 2 | Auth, Firestore rules, consent log | rules tests pass in emulator; a user cannot read another's data; consent append-only |
| 3 | Engine: waiver, milestone, expiry, bestCard, verdict, impact | all tests in Sec 8.5 pass; no I/O imports in `src/engine` (lint rule) |
| 4 | My cards + checkup screen | 3 cards entered in under 3 minutes; checkup matches hand-calculated fixture |
| 5 | Best card to pay with, including UPI | fixture cases give the expected winner and caveats |
| 6 | Alert pipeline + admin console + email | a fake change on a fixture card reaches a fixture user's email via the emulator; unapproved alerts never send |
| 7 | Reminders + web push | push arrives on Android Chrome and installed iOS PWA; quiet hours respected |
| 8 | Verdict + referral flow | neutrality tests pass; labels visible at 375px |
| 9 | Demo mode + landing + PWA polish | full 2-minute demo works offline; Lighthouse PWA installable; checks at 375px and 1280px |
| 10 | Deletion, export, privacy policy | delete leaves no user docs; export downloads JSON |
| 11 | Statement parsing (optional, only if time) | fixture PDFs parse in browser; nothing sent before the user confirms |
| 12 | Deploy, budget alert, pilot onboarding | Blaze budget alert set; 5 test users onboarded by hand |

Cut line if time runs short: drop 11, then 7's push (keep email), then F6 lounge tracker. Never cut 2, 3, 6 or 10.

---

## Sec 14. After the MVP (triggers, not promises)

| Idea | Build only if |
|---|---|
| Gmail statement reading | pilot users ask for it 10+ times and a CASA security review is budgeted |
| Android SMS parsing | native app justified and Play's SMS exception is approved |
| Account Aggregator | a regulated FIU partner is signed |
| WhatsApp alerts | email and push open rates are poor and unit cost is confirmed (sources conflict: Rs 0.115 vs Rs 0.145 per utility message) |
| Subscription | paid-price gate passes |
| Offer aggregation | someone owns daily data upkeep |
| Browser extension | desktop checkout is shown to matter in India |
| B2B (wealth apps, benefits platforms) | a partner asks for the engine |

---

## Sec 15. Risks and unresolved items

| Risk or open item | Notes | Owner |
|---|---|---|
| CardAdvisor already offers free alerts and open data | Differentiate on personal rupee impact, waiver and milestone tracking, verdict. Also a dependency risk: it is a single-author site with no SLA. Keep local snapshots. | Founder |
| Data upkeep is hard | Trackers elsewhere lag or contradict themselves. Cover only 25 to 30 cards well. | Founder |
| Alert-only retention unknown | UPI best-card habit is the bet for weekly use. Gate in Sec 12. | Founder |
| RBI directions flow-down to affiliates | Needs a lawyer. | Founder with counsel |
| Card-recommendation licensing | None found in sources read; not confirmed against primary text. | counsel |
| Name "Clutch" | Trademark search. Alternative: CardVigil. | Founder |
| Gemini model name | Sources conflict (3.5 Flash on the official page, 3.6 to 3.8 on a tracker). Read the official pricing page on build day; set `GEMINI_MODEL` env var. Do not hard-code. | Founder |
| Gemini paid tier for user data | Required (Sec 2.9). | Founder |
| Blaze billing card | Needed for Functions. Set a budget alert. | Founder |
| iOS push limits | 16.4 or later, installed PWA. Email is the fallback. | build |
| Statement parsing in browser | Parsers are Python; feasibility unverified. Optional. | build |
| Buildathon deadline | Window reported as closing 13 Nov 2026 with no stated time; check the portal. Needs idea, solution, architecture, deck, not an MVP. | Founder |
| Draper | Hero Training Fall 2026 deadline passed (30 Sept); no 2027 cohort published; cost unconfirmed. | Founder |

---

## Sec 16. Programme positioning

### 16.1 Google Startup Buildathon India 2026

- Timeline reported: shortlist 18 Nov, city rounds 20 to 21 Nov, finale 2 Dec in Bengaluru. Rounds build in person; arrive with the Sec 13 steps 0 to 5 done so the two days go to alerts, the admin console and the demo.
- Fit: uses Gemini (extraction and wording) and Google Cloud (Firebase, Functions, FCM, Hosting).
- Application answers: **idea** = Sec 1; **solution** = Sec 3 and 8; **architecture** = Sec 5 diagram; **deck** = the existing Clutch pitch deck.
- Judge-facing line: "The model never touches the money. It reads and words; a tested rules engine does the maths." This is the deterministic-versus-LLM split in Sec 2.3.

### 16.2 Draper University

- Founder-focused application. Use the same product, pilot numbers and the founder story. Do not state a deadline until Draper publishes one.

### 16.3 What to show in any demo

Demo mode (Sec 3.3) in 2 minutes: checkup → alert on a held card → waiver bar → pay-with → verdict. Say plainly it is a pilot and revenue is Rs 0.

---

## Sec 17. Tech stack and versions

Pin versions at scaffold time and record them in `docs/build-log.md`. Do not rely on versions written here.

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js (App Router), TypeScript strict, React | PWA via manifest and service worker |
| UI | Tailwind, shadcn/ui | semantic colour tokens only |
| Auth, data | Firebase Auth, Firestore | Google sign-in |
| Server | Cloud Functions 2nd gen | Node, TypeScript |
| Push | Firebase Cloud Messaging web push | |
| Email | Resend (3,000 a month free), chosen 2026-11-14 | HTTP API via fetch; emulator writes to an `outbox` collection instead |
| LLM | Gemini API, paid tier | model name from env |
| Test | Vitest, Playwright, Firebase emulator rules tests | |
| Lint, format | Biome (or ESLint plus Prettier) | one tool, in a hook |
| CI | GitHub Actions | typecheck, lint, test |

Brand: navy #14213D, cream #F6F4EE, amber #F2A33A, dark amber #A84F12, teal #2EC4B6. Fonts Poppins (headings) and DM Sans (body). Logo files are in the Founder's brand folder.

---

## Sec 18. Verified facts and sources

Facts used in this document, as found on 13 to 14 November 2026. Re-check anything before it goes in front of a judge or investor.

| Fact | Source |
|---|---|
| CardAdvisor: 280 cards, CC BY 4.0, 1,800 change events, JSON/RSS/iCal, API limits | cardadvisor.in/data, cardadvisor.in/developers |
| Firebase Functions and App Hosting need Blaze; 2M invocations a month free | firebase.google.com/pricing |
| Gemini free-tier content may be used to improve products; paid tier not | ai.google.dev/gemini-api/docs/pricing |
| RBI permits storing last four digits and issuer name | RBI/2021-22/96 (as read in research notes) |
| DPDP operative duties from about May 2027 | research notes (programs_and_legal.md) |
| RBI sales-practices directions RBI/2026-27/115, effective 1 Jan 2027 | research notes (programs_and_legal.md) |
| About 38% of credit card transactions by volume via RuPay on UPI (late 2025) | Bernstein via Mint, 27 to 29 Oct 2025 |
| ICICI multi-card benefit cut announced 12 Nov 2026 | research notes (viability_and_features.md) |
| 5.2 crore cardholders; 22% hold 3+ cards | CIBIL, March 2026 (as used in lean canvas) |
| Google Startup Buildathon India 2026 dates | research notes (programs_and_legal.md) |
| Draper Hero Training: 5 weeks, San Mateo; Fall 2026 deadline 30 Sept | research notes (programs_and_legal.md) |
| CRED about 1.7 crore monthly members | FinTech Global, June 2026 |

Not verified, do not quote: Gemini current model name, WhatsApp template price, Buildathon closing time, referral payout range against real partner terms, Draper cost.
