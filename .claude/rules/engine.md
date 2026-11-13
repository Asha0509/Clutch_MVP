---
paths: ["src/engine/**/*.ts", "tests/engine/**/*.ts"]
---
- Pure functions only: no fetch, no Firebase, no Date.now(), no Math.random(). Pass `today` in.
- Integer rupees. No floats for money.
- Every function gets table-driven tests with the expected number worked by hand in a comment.
- Deterministic tie-breaks (PRD Sec 8.3).
- Never import from referral/ or read payout in anything that ranks (PRD Sec 9).
