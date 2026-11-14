import { test } from "@playwright/test";

// `pnpm demo:record`: a paced walk through the demo, saved as demo-recording/clutch-demo.webm for the
// Founder to send to investors or narrate over. Pauses give room for a voice-over.
test("record the 2-minute demo", async ({ page }) => {
  const pause = (ms = 6000) => page.waitForTimeout(ms);
  const next = () => page.getByRole("link", { name: /^Next:/ }).click();

  await page.goto("/");
  await pause(5000);
  await page.getByRole("link", { name: "See the 2-minute demo" }).click();
  await pause(9000);
  await next();
  await pause(9000);
  await next();
  await pause(7000);
  await next();
  await pause(5000);
  // Show it is live: switch the same Rs 2,000 grocery payment from UPI to card.
  await page.getByLabel("How you pay").selectOption({ label: "Card" });
  await pause(6000);
  await next();
  await page.mouse.wheel(0, 500);
  await pause(10000);

  const video = page.video();
  await page.close();
  await video?.saveAs("demo-recording/clutch-demo.webm");
});
