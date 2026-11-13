# Clutch MVP: is it worth building, and what to build

Date: 14 November 2026. Based on four research passes (market and features, technical, legal and programmes, Claude Code tooling) plus the earlier due-diligence and lean-canvas reviews. Source links are in the research notes folder and in the PRD's verified-facts table.

## 1. Verdict

**Conditional go, as a lean product. Not yet a venture-scale bet.**

- No analogue anywhere has reached venture scale on card tracking and alerts. Kudos has about 500K members after $17M+ and four years. AwardWallet has 860K after roughly twenty years. Uthrive stopped updating in 2024. Curve sold for about half the capital it raised. Indian comparables (CheQ) drifted into loans and UPI.
- CRED (about 1.7 crore monthly members) sits above Clutch and CardAdvisor sits beside it. CardAdvisor now advertises free "Card Alerts" for fee and reward-rate changes, with no login and no paid placements. That narrows the gap Clutch claimed on 24 October.
- The problem is real and recurring. ICICI announced another multi-card benefit cut on 12 November 2026. Lounge gating was the most common devaluation type in 2026. Independent reviewers still say no Indian app tracks reward points well.
- Retention of alert-only apps is not evidenced either way. Analogues bundle alerts with a daily-use feature and paywall them.

So: build the MVP because it is cheap (about 3 to 4 weeks, close to zero running cost), and treat it as a way to buy evidence. Do not describe it as proven.

## 2. What the MVP must prove (gates)

| Gate | Test | Pass mark |
|---|---|---|
| Concierge | Hand-send 20 people a personal card checkup and 4 weeks of alerts | 12+ say they would be upset to lose it; 3+ act on an alert |
| Paid price | Show a ₹99 to ₹199 a year price for the fee-waiver and verdict features | 10%+ of active users tap through to pay screen |
| Referral click | In the "keep or close" verdict, offer a labelled "find a better card" step | 15%+ of verdict viewers click, and zero complaints about neutrality |
| Habit | UPI best-card check | 3+ checks per active user per week, Day-30 retention 15%+ |

If the concierge gate fails, stop. The code is cheap to throw away.

## 3. Features added after the research (market, economic, technical, legal)

Kept from the earlier plan: card checkup, rule-change alerts for held cards, renewal and waiver guard, points expiry, best card to pay with, due-date calendar.

Added or changed:

1. **Fee-waiver and milestone progress bar** (market, retention). Rupee value, a deadline, works on manual entry. Nobody in India was found doing it.
2. **Keep, downgrade or close verdict before renewal** (economic). The one natural, user-initiated moment for a labelled referral. This is the revenue surface, so alerts stay free of offers.
3. **RuPay and UPI-on-credit-card logic in the best-card engine** (market). About 38% of credit card transactions by volume by late 2025 (Bernstein via Mint). This is the only realistic route to weekly use.
4. **Lounge-eligibility tracker** ("₹X more by 31 Dec") (viral). Lounge cuts are the most-shared devaluation type.
5. **Consent log and data-deletion flow** (legal). DPDP duties start around 12 to 14 May 2027; building them now avoids a rewrite.
6. **Evidence label on every alert** (trust and legal). Each alert links the issuer notice and shows the verification tier. Human approval before any alert goes out.
7. **Referral neutrality rules** (legal and trust). Ranking never uses payout. Fee shown on screen. Ads labelled as ads (CCPA dark-pattern guidelines). Default-"No" consent for marketing (RBI sales-practice directions, 1 Jan 2027, likely to flow down to partners).
8. **Email as the guaranteed channel**, FCM web push as the second. iOS web push needs iOS 16.4+ and an installed PWA.

Moved out of the MVP: bills and EMI view (ship as a due-date calendar only), Gmail ingestion (CASA security review), Android SMS (Play exception), Account Aggregator (needs a regulated FIU), WhatsApp alerts (verification, template approval, and conflicting price data), browser extension (weak India fit), credit-score integration (commoditised), offer aggregation (daily data upkeep).

## 4. Scope in one paragraph

A mobile-first PWA. The user signs in with Google, picks the cards they hold from a catalogue of 25 to 30 launch cards (optionally last four digits), and gets a checkup showing rupees at risk, per-card alerts, a fee-waiver and milestone bar, expiry reminders, a due-date calendar, a best-card-to-pay suggestion and a keep, downgrade or close verdict. All numbers come from a deterministic rules engine over a static, versioned card catalogue. Gemini only turns user text or a statement into structured fields and words the alert. No bank login, no SMS, no email reading in the MVP.

## 5. Stack (and why)

Next.js PWA, Firebase (Google sign-in, Firestore, Cloud Functions, FCM, Hosting or App Hosting), Gemini API, email through Resend or Brevo. It fits the Google Buildathon requirement (Gemini plus Google Cloud), and Firebase needs the Blaze plan for Functions, with expected spend near zero. Set a budget alert on day one.

Data: seed from CardAdvisor's open dataset (280 cards, CC BY 4.0, attribution required) and hand-verify 25 to 30 launch cards against issuer MITC documents, because milestones, points expiry and UPI rules are not in the dataset. Use its change feed (1,800 dated events, JSON, RSS, iCal) as a trigger only, never as the final word. Ship the catalogue as a static file; do not call the API at runtime.

## 6. Legal checklist (needs a lawyer before public launch)

- Store only card product, issuer and optional last four digits. RBI's circular on card data storage permits last four digits and issuer name. Never take full number, expiry or CVV.
- Until the DPDP operative provisions start (May 2027), IT Act s.43A and the SPDI Rules apply: publish a privacy policy and keep reasonable security. Build to the DPDP standard now: notice, consent and withdrawal, one-year logs, 72-hour breach notice, 90-day grievance response, parental consent under 18.
- RBI sales-practice directions (RBI/2026-27/115) bind banks, effective 1 Jan 2027, and reach anyone a bank "engages" to sell or promote. Whether Clutch's referral flow counts as that is unconfirmed. This is the main question for a lawyer, along with whether card recommendation needs any licence (none found, not confirmed against primary text).
- Ads must be disclosed as ads (CCPA 2023 guidelines); finance content follows ASCI rules.
- Google Play: file the Financial features declaration; no SMS permission in MVP. Ship as a PWA first.
- Name: "Clutch" is a common English word. Run an IP India search in classes 9, 36 and 42 before committing. CardVigil remains the fallback.

## 7. Programmes

- **Google Startup Buildathon India 2026.** The application window was reported as closing on 13 November 2026; the closing time was not stated, so it may still be open. It asks for an idea, solution, architecture and pitch deck, not a finished MVP. Shortlist 18 November, city rounds 20 to 21 November, finale 2 December in Bengaluru. Needs Gemini and Google Cloud, which the stack covers.
- **Draper University.** The open programme is Hero Training, a five-week in-person course in San Mateo. The Fall 2026 deadline was 30 September; no 2027 cohort is published and cost is unconfirmed. There is nothing to hit this week. Use the same MVP and deck when a cohort opens.

## 8. Claude Code tooling (honest version)

Worth it:
- A short CLAUDE.md (under 200 lines: Commands, Conventions, Gotchas). Anthropic says architecture descriptions and ALL-CAPS emphasis are outdated advice.
- Hooks for enforcement: a Stop hook that runs the typecheck, a formatter after edits, and deny rules for `.env`.
- `typescript-lsp`, the shadcn skill (real components instead of invented ones), Playwright for looking at the UI at 375px and 1280px, `/security-review` once before the demo.
- Ponytail, if you already like it. Install with the plugin commands or `@dietrichgebert/ponytail`. The sample repo's `npm install -g ponytail` installs an unrelated 2019 package.
- Habits that actually save tokens: `/clear` between tasks, pick the model at the start of a session, cheaper model for routine subagents, remove unused MCP servers, check `/usage` and `/context`.

Not recommended: RTK, caveman, context-mode, Serena, claude-context, claude-code-router. Independent tests show little or no saving, and each adds always-on context or moving parts. `security-guidance` is fine only with `ENABLE_CODE_SECURITY_REVIEW=0`, otherwise it spends an Opus call on every file-changing turn. Keep the repo in the Linux filesystem on WSL2, not under `/mnt/c`.

Untested by me: the exact plugin slugs for `frontend-design` and a few others were inferred from marketplace names. setup.sh installs them with `|| true` and prints what failed.

## 9. Open items

1. Buildathon: check the portal now; if open, submit idea, solution, architecture and the existing deck.
2. Trademark search for Clutch.
3. Lawyer: RBI DSA/DMA applicability, card-recommendation licensing, referral disclosures.
4. Gemini model name: sources conflict (3.5 Flash on the official page, 3.6 to 3.8 on a tracker). Read it from the pricing page on build day and set it in one env variable.
5. WhatsApp pricing conflicts (₹0.115 vs ₹0.145; in-window charge). Defer.
6. Verify launch-card data by hand against issuer documents. That is the real work.
