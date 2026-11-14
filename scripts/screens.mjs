// Regenerates the screenshots in docs/images (README and pitch deck) from a running production build.
// Usage: pnpm build && pnpm start -p 3300, then: node scripts/screens.mjs http://localhost:3300
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3300";
const out = "docs/images";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

async function shot(name, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
async function open(path, name, width) {
  await page.setViewportSize({ width: width ?? 1280, height: 900 });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await shot(name, width);
}

await open("/", "landing");
for (const step of ["checkup", "change", "waiver", "pay", "verdict"])
  await open(`/demo/${step}`, `demo-${step}`);

// The working prototype, starting from the example person.
await page.goto(`${base}/start`);
await page.getByLabel("Month").selectOption("January");
await page.getByLabel("Year").selectOption("1995");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Fill with an example" }).click();
await open("/cards", "app-cards");

await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
await page
  .locator("summary", {
    hasText: "Earn rate cut ~25%: per ₹150 raised to per ₹200",
  })
  .click();
const change = page
  .locator("details")
  .filter({ hasText: "Earn rate cut ~25%: per ₹150 raised to per ₹200" });
await change.getByLabel("Change to price").selectOption("rate");
await change.getByLabel("Category").selectOption("online-shopping");
await change.getByLabel("Rate before, in %").fill("0.267");
await change.getByLabel("Rate after, in %").fill("0.2");
await change
  .getByRole("checkbox", { name: "I opened the bank's notice" })
  .click();
await change.getByRole("button", { name: "Approve and send" }).click();
await page.getByRole("status").waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await shot("app-console");

await page.goto(`${base}/checkup`, { waitUntil: "networkidle" });
await page
  .locator("details")
  .first()
  .evaluate((d) => (d.open = true));
await shot("app-checkup");
await shot("mobile-checkup", 375);

await page.goto(`${base}/pay`, { waitUntil: "networkidle" });
await page.getByLabel("Amount in Rs").fill("2000");
await page.getByLabel("How you pay").selectOption("upi");
await shot("app-pay");
await open("/verdict", "app-verdict");

await browser.close();
