# Clutch

An honest friend for Indian credit cards. Clutch tells a cardholder, in rupees, what their cards are quietly costing them (fees they can still avoid, points about to expire, milestones within reach), which of their own cards to use for a payment (including UPI on RuPay credit cards), and what a bank's rule change means for their own spend.

**Status:** pilot-stage MVP. 9 credit cards checked field by field against each bank's own terms. No users yet; revenue Rs 0. Full spec: [`docs/prd.md`](docs/prd.md).

## Run it

Needs Node 22 and pnpm. Live mode also needs Java 21 (for the Firebase emulators).

```bash
pnpm install
```

**Investor demo (no Firebase, works offline after one visit):**

```bash
pnpm build && pnpm start      # then open http://localhost:3000 and click "See the 2-minute demo"
```

The talk track is in [`docs/demo-script.md`](docs/demo-script.md). `pnpm demo:record` saves a paced walkthrough video to `demo-recording/clutch-demo.webm`.

**Live mode (sign-in, your own cards, alerts), on local Firebase emulators:**

```bash
pnpm emulators                # terminal 1: Auth, Firestore and Functions (project demo-clutch)
pnpm dev                      # terminal 2: then open http://localhost:3000/start
```

To use the admin console at `/admin`, give your emulator user the claim `{"admin": true}` in the Emulator UI (http://127.0.0.1:4000, Authentication, edit user, custom claims).

## Where the logic lives

| Part             | Path                                                       | What it does                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rules engine     | [`src/engine/`](src/engine)                                | Pure TypeScript, no I/O, no clock, no randomness (enforced by a lint rule). Best card for a payment, fee-waiver and milestone pace, points expiry, rupees at risk, keep/downgrade/close verdict, rupee impact of a rule change. Every rupee figure in the product comes from here. Integer rupees, rounded down so savings are never overstated. |
| Card catalogue   | [`data/catalogue/`](data/catalogue)                        | 9 cards; every field checked against the bank's own terms, with page references in `checklist.md`. Validated with zod on load.                                                                                                                                                                                                                   |
| Server functions | [`functions/src/`](functions/src)                          | Firebase Cloud Functions: a daily change-feed ingest that only writes pending alerts, and an admin-only approval that prices each change per user with the same engine and emails only users who consented.                                                                                                                                      |
| Security rules   | [`firestore.rules`](firestore.rules)                       | Users can only touch their own data; no card numbers or CVV can be stored; under-18s get no profile; the consent log is append-only; alerts are server-written only.                                                                                                                                                                             |
| Screens          | [`src/app/`](src/app), [`src/components/`](src/components) | Next.js PWA. Views are pure and shared by the live app and the demo.                                                                                                                                                                                                                                                                             |

The language model (Gemini, planned) will only read text and word alerts; it never computes money.

## Tests

```bash
pnpm test          # unit tests: engine (expected rupees worked by hand in comments), catalogue, functions, demo data
pnpm test:rules    # Firestore security rules, in the emulator
pnpm e2e           # live app end to end, on the emulators
pnpm e2e:demo      # investor demo on a production build, including offline
pnpm typecheck && pnpm lint
```

CI runs typecheck, lint, unit tests, rules tests and the catalogue check on every push.

## Data and credits

Card facts are derived from the [CardAdvisor open dataset](https://cardadvisor.in/data) (CC BY 4.0) and checked against each bank's own documents. See [`data/catalogue/ATTRIBUTION.md`](data/catalogue/ATTRIBUTION.md). Clutch gives information, not financial advice.
