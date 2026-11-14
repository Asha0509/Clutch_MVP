import { defineConfig } from "vitest/config";

// Firestore rules tests run only inside the emulator: `pnpm test:rules` (PRD Sec 6.4, Sec 13 step 2).
export default defineConfig({
  test: { include: ["tests/rules/**/*.test.ts"], testTimeout: 20000, fileParallelism: false },
});
