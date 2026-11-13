#!/usr/bin/env bash
# Clutch MVP: one-shot, re-runnable setup.
# Scaffolds the app, installs tooling, writes the project config, runs checks.
# Usage: ./setup.sh [--no-claude] [--no-commit] [--skip-shadcn] [--help]
# Needs: node 20+, git, internet. Run it inside the Linux filesystem (WSL2: ~/code), not /mnt/c.
set -euo pipefail

NO_CLAUDE=0; NO_COMMIT=0; SKIP_SHADCN=0
for arg in "$@"; do
  case "$arg" in
    --no-claude) NO_CLAUDE=1 ;;
    --no-commit) NO_COMMIT=1 ;;
    --skip-shadcn) SKIP_SHADCN=1 ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
WARNINGS=()
say()  { printf '\n==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; WARNINGS+=("$*"); }
have() { command -v "$1" >/dev/null 2>&1; }

# ---------- 0. guards ----------
say "Checking environment"
case "$ROOT" in
  /mnt/*) echo "Move this repo into the Linux filesystem (for example ~/code/clutch-mvp). Installs and hot reload break under /mnt." >&2; exit 1 ;;
esac
for f in CLAUDE.md docs/prd.md; do
  [ -f "$f" ] || { echo "Missing $f. Put CLAUDE.md, docs/prd.md and setup.sh together first." >&2; exit 1; }
done
have node || { echo "Node 20+ is required. Install it (nvm or nodejs.org) and rerun." >&2; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node 20+ required, found $(node -v)." >&2; exit 1; }
have git || { echo "git is required." >&2; exit 1; }

if ! have pnpm; then
  if have corepack; then corepack enable && corepack prepare pnpm@latest --activate || npm install -g pnpm
  else npm install -g pnpm; fi
fi
have pnpm || { echo "Could not install pnpm." >&2; exit 1; }
have jq || warn "jq not found. The format hook needs it: sudo apt-get install -y jq  (or brew install jq)"

# ---------- 1. scaffold Next.js (only once) ----------
if [ ! -f package.json ]; then
  say "Scaffolding Next.js app"
  TMP="$(mktemp -d)"
  pnpm dlx create-next-app@latest "$TMP/app" --ts --tailwind --eslint --app --src-dir \
    --import-alias "@/*" --use-pnpm --skip-install --yes
  # copy scaffold in without overwriting our own files
  ( cd "$TMP/app" && tar cf - . ) | tar xf - --skip-old-files -C "$ROOT"
  rm -rf "$TMP"
else
  say "package.json exists, skipping scaffold"
fi

# ---------- 2. dependencies ----------
say "Installing dependencies"
pnpm install
pnpm add firebase zod
pnpm add -D vitest @vitest/coverage-v8 @playwright/test prettier firebase-tools \
  @firebase/rules-unit-testing tsx firebase-admin

# ---------- 3. package.json scripts ----------
say "Writing package.json scripts"
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.scripts = Object.assign({}, p.scripts, {
  typecheck: "next typegen && tsc --noEmit",
  format: "prettier --write .",
  test: "vitest run",
  "test:rules": "firebase emulators:exec --only firestore \"vitest run tests/rules\"",
  e2e: "playwright test",
  emulators: "firebase emulators:start --only auth,firestore,functions",
  "catalogue:check": "tsx scripts/check-catalogue.ts"
});
if (!p.scripts.lint) p.scripts.lint = "next lint";
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
'

# ---------- 4. project files (never overwrite existing) ----------
say "Writing project files"
put() { # put <path> ; content on stdin; skip if file exists
  if [ -e "$1" ]; then cat >/dev/null; echo "  keep  $1"; else mkdir -p "$(dirname "$1")"; cat >"$1"; echo "  write $1"; fi
}

put .env.example <<'EOF'
# Copy to .env.local and fill in. Never commit .env.local. Claude Code cannot read it.
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
# Server side only (Firebase secrets in production)
GEMINI_API_KEY=
# Read the current model name from the official Gemini pricing page. Do not hard-code in source.
GEMINI_MODEL=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
BREVO_API_KEY=
# Founder email for admin alerts (set locally, never commit)
ADMIN_NOTIFY_EMAIL=
# Use emulators in dev
NEXT_PUBLIC_USE_EMULATORS=true
EOF

# .gitignore additions
touch .gitignore
for line in ".env" ".env.local" ".env*.local" "secrets/" "logs/*" "!logs/.gitkeep" "firebase-debug.log" "*.log" "playwright-report/" "test-results/" ".firebase/" "coverage/" "CLAUDE.local.md"; do
  grep -qxF "$line" .gitignore || echo "$line" >> .gitignore
done
mkdir -p logs && touch logs/.gitkeep

put README.md <<'EOF'
# Clutch MVP

An honest friend for your credit cards. India.

- Spec: `docs/prd.md`
- Claude Code instructions: `CLAUDE.md`
- Start: `./setup.sh`, then `cp .env.example .env.local`, then `pnpm emulators` and `pnpm dev`

Card facts are seeded from the CardAdvisor open dataset (CC BY 4.0, https://cardadvisor.in/data) and checked by hand against issuer documents.
Clutch gives information, not financial advice.
EOF

put docs/build-log.md <<'EOF'
# Build log

Append only. One entry per failure or decision: date, what failed, cause, fix.

| Date | Step (PRD Sec 13) | What happened | Fix |
|---|---|---|---|
EOF

put docs/research-summary.md <<'EOF'
# Research summary

Verdict (14 Nov 2026): conditional go as a lean product, not yet venture-scale. Pilot gates in PRD Sec 12 decide whether to continue.
Full report: keep a copy of "Clutch MVP viability and build plan" here.
EOF

put data/catalogue/ATTRIBUTION.md <<'EOF'
Card facts in this catalogue are derived from the CardAdvisor open dataset, CC BY 4.0 (https://cardadvisor.in/data), and verified against issuer documents. Milestones, points expiry, lounge gates and UPI rules are hand-curated by the Founder. Ratings and editorial content from the source are not used.
EOF

put data/catalogue/catalogue.json <<'EOF'
{ "version": "0.0.0", "source": "cardadvisor.in CC BY 4.0", "cards": [] }
EOF

put data/fixtures/README.md <<'EOF'
Synthetic users and statements only. No real customer data. Ten users are specified in PRD Sec 8.5.
EOF

put src/engine/types.ts <<'EOF'
import { z } from "zod";

// Sec 7.1. Single source of truth for the card catalogue schema.
export const RewardRule = z.object({
  category: z.string(),
  ratePct: z.number().nonnegative(),
  monthlyCapRs: z.number().int().nonnegative().nullable(),
  capBasis: z.enum(["reward", "spend"]).nullable(),
  exclusions: z.array(z.string()),
  pointValuePaisa: z.number().nonnegative().nullable(),
});

export const Milestone = z.object({
  period: z.enum(["year", "quarter", "month", "anniversary-year"]),
  spendRs: z.number().int().nonnegative(),
  benefit: z.string(),
  benefitValueRs: z.number().int().nonnegative().nullable(),
});

export const Card = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  issuer: z.string(),
  name: z.string(),
  network: z.enum(["VISA", "MASTERCARD", "RUPAY", "AMEX", "DINERS"]),
  joiningFeeRs: z.number().int().nonnegative(),
  annualFeeRs: z.number().int().nonnegative(),
  lifetimeFree: z.boolean(),
  feeWaiverSpendRs: z.number().int().nonnegative().nullable(),
  forexMarkupPct: z.number().nonnegative().nullable(),
  rewards: z.array(RewardRule),
  milestones: z.array(Milestone),
  pointsExpiryMonths: z.number().int().positive().nullable(),
  lounge: z.unknown().nullable(),
  upiOnCredit: z.unknown().nullable(),
  verified: z.object({ on: z.string(), sourceUrl: z.string().url() }),
});

export const Catalogue = z.object({
  version: z.string(),
  source: z.string(),
  cards: z.array(Card),
});

export type Card = z.infer<typeof Card>;
export type Catalogue = z.infer<typeof Catalogue>;
EOF

put src/engine/format.ts <<'EOF'
// Money is integer rupees. Format only at the edge.
export function formatRs(rupees: number): string {
  return "Rs " + Math.round(rupees).toLocaleString("en-IN");
}
EOF

put tests/engine/format.test.ts <<'EOF'
import { describe, expect, it } from "vitest";
import { formatRs } from "@/engine/format";

describe("formatRs", () => {
  // 1,00,000 in Indian grouping
  it("groups in lakhs", () => {
    expect(formatRs(100000)).toBe("Rs 1,00,000");
  });
  it("rounds to whole rupees", () => {
    expect(formatRs(8000.4)).toBe("Rs 8,000");
  });
});
EOF

put scripts/check-catalogue.ts <<'EOF'
import { readFileSync } from "node:fs";
import { Catalogue } from "../src/engine/types";

const raw = JSON.parse(readFileSync("data/catalogue/catalogue.json", "utf8"));
const parsed = Catalogue.parse(raw);
const ids = new Set<string>();
for (const c of parsed.cards) {
  if (ids.has(c.id)) throw new Error(`duplicate card id: ${c.id}`);
  ids.add(c.id);
}
console.log(`catalogue ok: ${parsed.cards.length} cards, version ${parsed.version}`);
EOF

put scripts/make-admin.ts <<'EOF'
// Run by the Founder only, against the project they are logged in to:
//   Use `gcloud auth application-default login` first (no key file on disk).
//   pnpm tsx scripts/make-admin.ts <uid>
export {};
const uid = process.argv[2];
if (!uid) {
  console.error("usage: pnpm tsx scripts/make-admin.ts <uid>");
  process.exit(1);
}
const { initializeApp, applicationDefault } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
initializeApp({ credential: applicationDefault() });
await getAuth().setCustomUserClaims(uid, { admin: true });
console.log(`admin claim set for ${uid}`);
EOF

put vitest.config.ts <<'EOF'
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["tests/**/*.test.ts"], exclude: ["tests/rules/**", "tests/e2e/**"] },
});
EOF

put playwright.config.ts <<'EOF'
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true },
});
EOF
mkdir -p tests/e2e tests/rules

put firebase.json <<'EOF'
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
EOF

put firestore.indexes.json <<'EOF'
{ "indexes": [], "fieldOverrides": [] }
EOF

put firestore.rules <<'EOF'
rules_version = '2';
// PRD Sec 6.4. Deny by default; open only what is listed.
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin() { return signedIn() && request.auth.token.admin == true; }

    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
      match /{sub=**} {
        allow read, write: if signedIn() && request.auth.uid == uid;
      }
    }
    match /alerts/{id} {
      allow read, write: if isAdmin();
    }
    match /consents/{uid}/log/{id} {
      allow create: if signedIn() && request.auth.uid == uid;
      allow read: if signedIn() && request.auth.uid == uid;
      allow update, delete: if false;
    }
  }
}
EOF

mkdir -p functions && put functions/README.md <<'EOF'
Cloud Functions (2nd gen) go here: ingestChangeFeed, approveAlert, sendReminders, geminiExtract, deleteMyData. See PRD Sec 5 and 10.
Create with `firebase init functions` when you reach Sec 13 step 6, TypeScript, and choose pnpm.
EOF

put .github/workflows/ci.yml <<'EOF'
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: latest }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm catalogue:check
EOF

# ---------- 5. Claude Code project config ----------
say "Writing .claude config"
put .claude/settings.json <<'EOF'
{
  "permissions": {
    "allow": [
      "Bash(pnpm typecheck)",
      "Bash(pnpm lint)",
      "Bash(pnpm test)",
      "Bash(pnpm vitest run *)",
      "Bash(pnpm catalogue:check)",
      "Bash(pnpm format)"
    ],
    "ask": ["Bash(git push *)", "Bash(firebase deploy *)", "Bash(pnpm add *)"],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(firebase login*)",
      "Bash(gcloud auth*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs -r npx --no-install prettier --write --ignore-unknown >/dev/null 2>&1 || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "pnpm typecheck 1>&2 || exit 2"
          }
        ]
      }
    ]
  }
}
EOF

put .claude/rules/engine.md <<'EOF'
---
paths: ["src/engine/**/*.ts", "tests/engine/**/*.ts"]
---
- Pure functions only: no fetch, no Firebase, no Date.now(), no Math.random(). Pass `today` in.
- Integer rupees. No floats for money.
- Every function gets table-driven tests with the expected number worked by hand in a comment.
- Deterministic tie-breaks (PRD Sec 8.3).
- Never import from referral/ or read payout in anything that ranks (PRD Sec 9).
EOF

put .claude/rules/ui.md <<'EOF'
---
paths: ["src/app/**/*.tsx", "src/components/**/*.tsx"]
---
- shadcn/ui components via the CLI; do not hand-write ones that exist.
- Semantic colour tokens only. Mobile first.
- Check at 375px and 1280px with Playwright before saying done.
- Copy: plain and specific. Check against PRD Sec 2.1 (claims we never make).
- Referral cards: label in text at least 14px next to the card (PRD Sec 9).
EOF

put .claude/agents/reviewer.md <<'EOF'
---
name: reviewer
description: Read-only reviewer. Use after finishing a PRD build step to check it against the spec.
tools: Read, Grep, Glob
---
Review the changes for the current PRD step against docs/prd.md. Check that every requirement in the step's "done when" is implemented and that the listed edge cases have tests. Check the hard constraints in PRD Sec 2 and the claims list in Sec 2.1. Report gaps that affect correctness, privacy or the neutrality rules. Skip style.
EOF

# ---------- 6. UI kit ----------
if [ "$SKIP_SHADCN" -eq 0 ]; then
  say "Initialising shadcn/ui"
  if [ ! -f components.json ]; then
    pnpm dlx shadcn@latest init -d -y || warn "shadcn init failed; run: pnpm dlx shadcn@latest init"
  fi
  pnpm dlx shadcn@latest add button card input progress badge dialog sonner -y \
    || warn "shadcn add failed; add components later with: pnpm dlx shadcn@latest add <name>"
fi

# ---------- 7. Playwright browser ----------
say "Installing Playwright browser (chromium)"
pnpm exec playwright install chromium || warn "playwright browser install failed; run: pnpm exec playwright install chromium"

# ---------- 8. Claude Code plugins and MCP ----------
if [ "$NO_CLAUDE" -eq 0 ] && have claude; then
  say "Installing Claude Code plugins (failures are non-fatal)"
  npm ls -g typescript-language-server >/dev/null 2>&1 || npm install -g typescript-language-server typescript || warn "typescript-language-server install failed"
  claude plugin marketplace add anthropics/claude-plugins-official || true
  claude plugin install typescript-lsp@claude-plugins-official --scope project || warn "typescript-lsp plugin not installed"
  claude plugin install security-guidance@claude-plugins-official --scope project || warn "security-guidance plugin not installed"
  # Ponytail: correct package is @dietrichgebert/ponytail (the npm name 'ponytail' is a different, unrelated package)
  claude plugin marketplace add DietrichGebert/ponytail || true
  claude plugin install ponytail@ponytail --scope project || warn "ponytail plugin not installed (optional)"
  claude mcp add --scope project playwright -- npx @playwright/mcp@latest --headless || warn "playwright MCP not added"
  pnpm dlx skills add shadcn/ui || warn "shadcn skill not added (optional): pnpm dlx skills add shadcn/ui"
  echo "Tip: export ENABLE_CODE_SECURITY_REVIEW=0 in your shell profile to keep security-guidance to its free pattern check."
else
  warn "Claude Code CLI not found or --no-claude given; skipped plugin install. See CLAUDE.md, 'Tools installed by setup.sh'."
fi

# ---------- 9. verify ----------
say "Verifying"
pnpm typecheck
pnpm lint || warn "lint reported issues"
pnpm test
pnpm catalogue:check

# ---------- 10. git ----------
if [ ! -d .git ]; then git init -q -b main; fi
if [ "$NO_COMMIT" -eq 0 ]; then
  if git config user.name >/dev/null && git config user.email >/dev/null; then
    git add -A
    if ! git diff --cached --quiet; then git commit -q -m "set up clutch mvp scaffold"; echo "first commit made with your git identity"; fi
  else
    warn "git user.name / user.email not set; skipped first commit. Set them, then commit."
  fi
fi

say "Done"
if [ "${#WARNINGS[@]}" -gt 0 ]; then
  echo "Warnings:"; for w in "${WARNINGS[@]}"; do echo "  - $w"; done
fi
cat <<'EOF'

Next:
  1. cp .env.example .env.local   and fill in Firebase config (create a Firebase project first; Blaze plan + budget alert)
  2. pnpm emulators               (terminal 1)
  3. pnpm dev                     (terminal 2)
  4. gh repo create               (you run this; setup does not log in anywhere)
  5. Open Claude Code in this folder and start at PRD Sec 13, step 1.
EOF
