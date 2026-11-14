import { defineConfig } from "@playwright/test";

// Run with `pnpm e2e`, which starts the Auth and Firestore emulators first. The dev server here always
// talks to the emulators and uses its own port, so it never reuses a server with real Firebase keys.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  // One dev server and shared emulators: parallel browsers overloaded them (build log 2026-11-14).
  workers: 1,
  // The dev server compiles each route on first visit, which can take several seconds.
  expect: { timeout: 20_000 },
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm next dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_USE_EMULATORS: "true" },
  },
});
