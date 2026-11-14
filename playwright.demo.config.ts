import { defineConfig } from "@playwright/test";

// Investor demo checks (PRD Sec 3.3, Sec 13 step 9). Runs the production build, where the offline
// service worker exists. No emulators: demo mode never touches Firebase.
export default defineConfig({
  testDir: "tests/demo",
  timeout: 180_000,
  workers: 1,
  expect: { timeout: 20_000 },
  use: { baseURL: "http://localhost:3200" },
  webServer: {
    command: "pnpm build && pnpm next start --port 3200",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [
    { name: "demo", testMatch: /demo\.spec\.ts/ },
    {
      name: "record",
      testMatch: /record\.spec\.ts/,
      use: {
        viewport: { width: 1280, height: 800 },
        video: { mode: "on", size: { width: 1280, height: 800 } },
        launchOptions: { slowMo: 150 },
      },
    },
  ],
});
