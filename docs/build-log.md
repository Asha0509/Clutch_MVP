# Build log

Append only. One entry per failure or decision: date, what failed, cause, fix.

| Date | Step (PRD Sec 13) | What happened | Fix |
|---|---|---|---|
| 2026-11-13 | 0 | `pnpm test`, typecheck, lint, catalogue:check pass; `pnpm dev` serves 200 on :3000. Emulators cannot start: `java: command not found` (Firestore emulator needs a JDK). No git remote, so CI has not run. | Founder to install JDK 21 (`sudo apt install openjdk-21-jre-headless`) and push to GitHub; then re-check emulators and CI. |
| 2026-11-13 | 0 | First CI run failed at `pnpm/action-setup`: workflow pinned `version: latest` while `package.json` sets `packageManager`; the action rejects two versions. | Removed the `with: version` line; CI green (run 43505513024). |
| 2026-11-13 | 0 | Founder installed OpenJDK 21. `pnpm emulators`: Auth (9099) and Firestore (8080) start and respond. Functions emulator fails: "No valid functions configuration detected in firebase.json", since `functions/` has no code yet. | Expected until Step 6 adds functions source and config. Step 0 done. |
