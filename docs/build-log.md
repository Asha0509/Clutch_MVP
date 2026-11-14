# Build log

Append only. One entry per failure or decision: date, what failed, cause, fix.

| Date | Step (PRD Sec 13) | What happened | Fix |
|---|---|---|---|
| 2026-11-13 | 0 | `pnpm test`, typecheck, lint, catalogue:check pass; `pnpm dev` serves 200 on :3000. Emulators cannot start: `java: command not found` (Firestore emulator needs a JDK). No git remote, so CI has not run. | Founder to install JDK 21 (`sudo apt install openjdk-21-jre-headless`) and push to GitHub; then re-check emulators and CI. |
| 2026-11-13 | 0 | First CI run failed at `pnpm/action-setup`: workflow pinned `version: latest` while `package.json` sets `packageManager`; the action rejects two versions. | Removed the `with: version` line; CI green (run 43505513024). |
| 2026-11-13 | 0 | Founder installed OpenJDK 21. `pnpm emulators`: Auth (9099) and Firestore (8080) start and respond. Functions emulator fails: "No valid functions configuration detected in firebase.json", since `functions/` has no code yet. | Expected until Step 6 adds functions source and config. Step 0 done. |
| 2026-11-13 | 1 | HDFC cards verified (millennia, regalia-gold, tata-neu-infinity, tata-neu-plus). TODO millennia: `forexMarkupPct` null; the MITC fee table shows one merged "3.50%" cell, not a per-card figure. | Confirm from the MITC table by eye, or from the card's fee schedule, then fill. |
| 2026-11-13 | 1 | TODO tata-neu-infinity, tata-neu-plus: `forexMarkupPct` and `pointsExpiryMonths` null (not stated; NeuCoins last to 31 Dec after the claim year). TODO tata-neu-infinity: `lounge.internationalPerYear` null. | Check the Tata Neu fee schedule and the Infinity lounge page. |
| 2026-11-13 | 1 | TODO regalia-gold: Smartbuy travel row dropped (seed 6.25% capped Rs 2,000; page says "up to 10X"). Point value 50 paise is the flights and hotels value. | Read the Smartbuy rewards T&C, then add the row. |
| 2026-11-13 | 1 | Schema changes beyond PRD Sec 7.1: `category` and `exclusions` use the Sec 8.1 enum; `merchants[]` added to RewardRule; LoungeRule and UpiRule defined; UPI only on RuPay; `verified.on` must be an ISO date. | Update the PRD Sec 7.1 schema block (founder approved in session). |
| 2026-11-13 | 1 | `pnpm format` run on the whole repo reformatted about 20 unrelated files and the lockfile. | Reverted all of them; format only the files being changed (`pnpm prettier --write <file>`). |
| 2026-11-13 | 1 | SBI: sbi-cashback verified. TODO sbi-simply-click: blocked, no SBI document states the reward point value for this variant (seed says 25 paise), and the partner list for 10X is an image. | Find the SimplyCLICK point value on SBI's rewards catalogue or ask SBI Card; read partner names by eye. Substitute HDFC Swiggy to keep the batch at 10. |
| 2026-11-13 | 1 | ICICI: icici-amazon-pay verified at the 3% non-Prime rate. TODO: Prime flag for the 5% tier; utilities and insurance caps (MITC p21 unreadable); Amazon's own exclusions (gold, tax, EMI). TODO icici-coral: blocked, no point value in ICICI documents and the MITC cap table is garbled. | Read MITC p21 by eye; find the ICICI point value; decide how to model Prime. |
