import { defineConfig } from "@playwright/test";

// End to end on the production build (the offline service worker only exists there). No emulators:
// the prototype keeps data in the browser and the demo never touches the network.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  workers: 1,
  expect: { timeout: 20_000 },
  use: { baseURL: "http://localhost:3200", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm build && pnpm next start --port 3200",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [
    { name: "e2e", testMatch: /(demo|prototype)\.spec\.ts/ },
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
