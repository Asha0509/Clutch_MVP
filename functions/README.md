# Cloud Functions

PRD Sec 5 and Sec 10. Built with esbuild into `lib/index.js`, bundling the shared rules engine (`../src/engine`) and the catalogue, because `firebase deploy` uploads only this folder.

- `ingestChangeFeed` (daily 06:00 IST): fetches `FEED_URL` (default CardAdvisor `changes.json`) and writes new alerts on catalogue cards as `pending`. It never sends.
- `approveAlert` (callable, `admin` claim only): approve or reject a pending alert. Approve writes `users/{uid}/alerts/{id}` for every holder with the engine's rupee impact, and emails holders whose latest `alerts_email` consent is a yes.

Email: Resend, using the `RESEND_API_KEY` secret and the `EMAIL_FROM` parameter. In the emulator without a key, mail goes to the `outbox` collection and `logs/sends.jsonl`. In production without a key or from address, nothing is sent and the log says so.

Commands: `pnpm --filter clutch-functions build`, `pnpm --filter clutch-functions typecheck`. `pnpm e2e` builds and runs these in the Functions emulator. Not yet planned: sendReminders (Step 7), geminiExtract, deleteMyData (Step 10). Ask before deploying.
