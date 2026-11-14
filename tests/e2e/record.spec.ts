import { test, type Page } from "@playwright/test";

// `pnpm demo:record`: a paced walk through the working prototype, saved as demo-recording/clutch-demo.webm
// for the Founder to send to investors or narrate over. Pauses give room for a voice-over.
const pause = (page: Page, ms: number) => page.waitForTimeout(ms);
const go = (page: Page, name: string) =>
  page.getByRole("link", { name, exact: true }).click();

test("record the prototype walkthrough", async ({ page }) => {
  // 1. Landing, then straight in: no sign-in, one age question.
  await page.goto("/");
  await pause(page, 5000);
  await page.getByRole("link", { name: "Try it with your cards" }).click();
  await page.getByLabel("Month").selectOption("January");
  await page.getByLabel("Year").selectOption("1995");
  await pause(page, 1500);
  await page.getByRole("button", { name: "Continue" }).click();
  await pause(page, 2500);

  // 2. Three real cards with an example month of spend.
  await page.getByRole("button", { name: "Fill with an example" }).click();
  await pause(page, 4000);

  // 3. The checkup, with the engine's working opened.
  await go(page, "Checkup");
  await pause(page, 5000);
  await page.getByText(/^How we worked out/).click();
  await pause(page, 8000);

  // 4. Live: record Rs 1,00,000 spent on Millennia and the fee drops out of the risk figure.
  await go(page, "My cards");
  await page
    .getByRole("listitem")
    .filter({ hasText: "HDFC Millennia Credit Card" })
    .getByRole("button", { name: "Add details" })
    .click();
  await page.getByLabel("Spend since your fee month, in Rs").fill("100000");
  await pause(page, 2000);
  await page.getByRole("button", { name: "Save details" }).click();
  await go(page, "Checkup");
  await pause(page, 6000);

  // 5. Pay with: Rs 2,000 of groceries by UPI.
  await go(page, "Pay with");
  await page
    .getByLabel("Amount in Rs")
    .pressSequentially("2000", { delay: 120 });
  await page.getByLabel("How you pay").selectOption("upi");
  await pause(page, 6000);

  // 6. Verdict from the person's own month.
  await go(page, "Verdict");
  await pause(page, 7000);

  // 7. Founder console: approve a real change from the live log, then see it priced on the checkup.
  await go(page, "Founder console");
  await pause(page, 4000);
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
  await pause(page, 2500);
  await change.getByRole("button", { name: "Approve and send" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(page, 5000);
  await go(page, "Checkup");
  await page.getByText("Changes to your cards").scrollIntoViewIfNeeded();
  await pause(page, 8000);

  const video = page.video();
  await page.close();
  await video?.saveAs("demo-recording/clutch-demo.webm");
});
