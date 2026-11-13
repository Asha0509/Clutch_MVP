# Clutch MVP

Honest friend for Indian credit cards. Tells a cardholder, in rupees, what their cards are quietly costing them, and which card to use. Full spec: docs/prd.md. Cite sections as "Sec N" in code comments and commits. Read the PRD only when planning a feature, not every session.

Founder: Asha Jyothi Boddu. Refer to her in venture materials as "Founder" only.

# Commands

- Install: `pnpm install`
- Dev: `pnpm dev` (app) and `pnpm emulators` (Firebase Auth, Firestore, Functions)
- Typecheck: `pnpm typecheck` (also run by the Stop hook)
- Lint and format: `pnpm lint` / `pnpm format`
- All unit tests: `pnpm test`
- One test file: `pnpm vitest run path/to/file.test.ts`
- Rules tests (needs emulator): `pnpm test:rules`
- E2E: `pnpm e2e` (slow, not in hooks)
- Validate catalogue: `pnpm catalogue:check`
- Re-run setup safely: `./setup.sh` (idempotent; `./setup.sh --help`)

# Hard constraints (details in PRD Sec 2)

- Never store full card number, expiry, CVV, PIN, OTP or bank credentials. Allowed: card product, issuer, optional last four digits.
- No bank login, SMS, Gmail or Account Aggregator code in the MVP. Do not add those scopes or permissions.
- Gemini never computes money. Every rupee figure comes from `src/engine`. Gemini may only extract fields from user text or word an alert from facts already computed. Reject any model output containing a number not in its input.
- Alerts never contain offers. Referral flow is user-initiated only (PRD Sec 9). `fitScore` must not import from `referral/` or read payout.
- Nothing is sent as a rule-change alert until the Founder approves it in the admin console.
- Never put numbers in copy that the engine or catalogue did not produce. Never invent card facts; if unsure, leave the field null and add a TODO in `docs/build-log.md`.
- Claims we never make are listed in PRD Sec 2.1. Check UI copy against that list.

# Auth and logins

- Users: Google sign-in via Firebase Auth only. Scopes `openid email profile`, nothing else. No passwords, no phone OTP.
- Founder admin: same sign-in plus custom claim `admin: true` (set by `scripts/make-admin.ts <uid>`, run by the Founder). Check the claim on the server for every admin route and callable.
- Under-18 gate: ask birth year after sign-in; under 18 means show the "ask a parent" screen and create no profile.
- Work against the Firebase emulators. Do not log in to Firebase, gcloud, Google or any bank. Do not run `firebase deploy`, `gcloud` mutations or `gh repo create` unless the user asks in that message. The Founder logs in by hand.
- If a task seems to need a production credential, stop and tell the Founder which one and why.

# Secrets

- Env vars are listed in `.env.example`. Real values live in `.env.local` and Firebase secrets. You cannot read `.env*` (denied in settings). Do not ask the user to paste keys into chat.
- Never log tokens, emails, last-four digits or card names together with a user id. Logs use hashed user ids.
- Gemini model name comes from `GEMINI_MODEL`. Do not hard-code it.

# Conventions

- Next.js App Router, TypeScript strict, Server Components by default. Client components only for interaction.
- `src/engine/` is pure: no network, no Firebase, no `Date.now()` (pass `today`), no randomness. A lint rule enforces it.
- Money is integer rupees (`Rs`) or integer paise where fractions matter. Never floats for money. Format only at the edge with `formatRs()`.
- Validate every external input (user, Gemini, change feed) with zod. Schemas live next to types in `src/engine/types.ts`.
- UI is shadcn/ui. Add components with `pnpm dlx shadcn@latest add <name>`; never hand-write one that exists in the registry. Semantic colour tokens only, no raw hex outside `tailwind` config. Brand tokens: navy #14213D, cream #F6F4EE, amber #F2A33A, teal #2EC4B6.
- Mobile first. After any UI change, check the page at 375px and 1280px with Playwright before saying it is done.
- Plain, human copy. No exclamation marks, no "unlock", no "supercharge". Say "Rs 8,000 more by 31 Dec", not "boost your savings".
- Small commits, one line, lower-case imperative, no Co-Authored-By lines unless the user's session instructions say otherwise. Commits use the developer's own git identity from `git config`; never change it.
- Type hints everywhere. No dead code, no commented-out blocks, no unused exports. No new dependency without asking.
- Tests first for engine changes. Hand-work the expected number in a comment above the assertion.
- Cite PRD sections in comments as `// Sec 8.3` (ASCII).

# Build discipline

- Follow the build order in PRD Sec 13. Do one step at a time. Finish it (tests green, typecheck clean, build-log entry) before the next.
- Smallest change that meets the step's "done when". Do not add features from PRD Sec 14.
- Failures and fixes go in `docs/build-log.md` (append only): what failed, the cause, the fix. Read its last 40 lines when resuming.
- JSONL run logs go in `logs/` (gitignored). Never commit them.
- If the PRD and the code disagree, stop and ask; do not silently change either.
- Do not run Playwright or the emulators inside hooks.

# Token and context habits

- `/clear` between tasks. Start a session on the right model: a smaller model for catalogue data entry, tests and formatting; the larger one for engine design, security and Firestore rules.
- Use Plan mode (Shift+Tab) before any change that touches more than three files.
- Use subagents for broad searches and for read-only review (`.claude/agents/reviewer.md`). Do not read whole large files; use ranges.
- Do not `@`-import the PRD. Reference sections by number and read only those lines.
- Check `/context` and `/usage` if the session feels slow. Keep MCP servers to those listed below.

# Tools installed by setup.sh

- typescript-lsp plugin (diagnostics after edits)
- Playwright MCP (headless) for looking at the UI
- shadcn skill for correct component use
- Ponytail plugin (optional, installed if the CLI supports it)
- security-guidance plugin, with `ENABLE_CODE_SECURITY_REVIEW=0` (free pattern check only; run `/security-review` by hand before demo and deploy)
- Hooks (`.claude/settings.json`): format after Edit/Write; typecheck on Stop; deny reads of `.env*` and `secrets/`

Not installed on purpose: RTK, caveman-style output compressors, context-mode, router proxies. Independent tests showed little or no saving.

# Gotchas

- Keep this repo in the Linux filesystem (WSL2: `~/code/clutch-mvp`), never under `/mnt/c`. Installs and hot reload break there.
- Firebase Functions need the Blaze plan. Emulators work without it.
- iOS web push works only on iOS 16.4+ with the app installed to the home screen. Email is the guaranteed channel.
- The CardAdvisor dataset is CC BY 4.0. Keep `data/catalogue/ATTRIBUTION.md` and the footer line. Do not copy its ratings or editorial text.
- A change-feed entry is a trigger only. Never send an alert from it directly.
- Statement PDFs are parsed in the browser. Passwords and raw PDFs never leave the device.
- Gemini free tier may use content to improve Google products. Use synthetic data only unless the key is a paid-tier key.
- Next.js and shadcn versions move fast. Read the scaffolded `package.json` and `components.json` before assuming a flag exists.

# Compact instructions

Keep: current PRD step, failing test output, files changed, open decisions, any constraint the user stated this session.
