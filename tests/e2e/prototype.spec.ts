import { expect, test, type Page } from "@playwright/test";
import { shoot } from "./helpers";

// The working prototype: no sign-in, data in this browser, every figure from src/engine.
const KEY = "clutch.prototype.v1";
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function startAsAdult(page: Page) {
  await page.goto("/start");
  await page.getByLabel("Month").selectOption("January");
  await page.getByLabel("Year").selectOption("1995");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My cards" })).toBeVisible();
}

test("under 18 sees the ask-a-parent screen and nothing is stored", async ({
  page,
}) => {
  await page.goto("/start");
  await page.getByLabel("Month").selectOption("January");
  await page
    .getByLabel("Year")
    .selectOption(String(new Date().getFullYear() - 10));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Clutch is for people aged 18 and over",
    }),
  ).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
});

test("your own cards: details in, rupees out, live", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await startAsAdult(page);

  await page
    .getByRole("button", { name: /HDFC MoneyBack\+ Credit Card/ })
    .click();
  await page.getByRole("button", { name: "Add details" }).click();
  await page.getByLabel("Points or cashback balance").fill("3000");
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 20);
  await page.getByLabel("Date the next points expire").fill(iso(expiry));
  await page.getByLabel("Online shopping").fill("15000");
  await page.getByRole("button", { name: "Save details" }).click();

  // 3,000 points x 20 paise = Rs 600, expiring inside 60 days, so all of it is at risk.
  await page.getByRole("link", { name: "Checkup", exact: true }).click();
  await expect(page.getByTestId("at-risk")).toHaveText("Rs 600");
  await shoot(page, "proto-checkup");

  // The example person replaces the data; figures as worked in tests/lib/demo.test.ts.
  await page.getByRole("link", { name: "My cards", exact: true }).click();
  await page.getByRole("button", { name: "Fill with an example" }).click();
  await page.getByRole("link", { name: "Checkup", exact: true }).click();
  await expect(page.getByTestId("at-risk")).toHaveText("Rs 1,600");

  await page.getByRole("link", { name: "Pay with", exact: true }).click();
  await page.getByLabel("Amount in Rs").fill("2000");
  await page.getByLabel("How you pay").selectOption("upi");
  await expect(page.getByTestId("top-card")).toContainText(
    "Tata Neu Infinity HDFC Bank Credit Card",
  );
  await shoot(page, "proto-pay");

  await page.getByRole("link", { name: "Verdict", exact: true }).click();
  await expect(page.getByTestId("verdict-hdfc-millennia")).toContainText(
    "Costs you about Rs 40 a year more",
  );
  await shoot(page, "proto-verdict");
});

test("Founder approves a real feed change; the open checkup updates without a reload", async ({
  page,
  context,
}) => {
  await startAsAdult(page);
  await page.getByRole("button", { name: "Fill with an example" }).click();

  const user = await context.newPage();
  await user.goto("/checkup");
  await expect(user.getByTestId("at-risk")).toHaveText("Rs 1,600");
  await expect(user.getByText("Changes to your cards")).toHaveCount(0);

  await page.goto("/admin");
  await page
    .locator("summary", {
      hasText: "Earn rate cut ~25%: per ₹150 raised to per ₹200",
    })
    .click();
  const change = page
    .locator("details")
    .filter({ hasText: "Earn rate cut ~25%: per ₹150 raised to per ₹200" });
  await expect(change).toBeVisible();
  // Priced from the feed's words: 2 points per Rs 150 at 20 paise = 0.267%; per Rs 200 = 0.2%.
  await change.getByLabel("Change to price").selectOption("rate");
  await change.getByLabel("Category").selectOption("online-shopping");
  await change.getByLabel("Rate before, in %").fill("0.267");
  await change.getByLabel("Rate after, in %").fill("0.2");
  await change
    .getByRole("checkbox", { name: "I opened the bank's notice" })
    .click();
  await change.getByRole("button", { name: "Approve and send" }).click();
  await expect(page.getByRole("status")).toContainText("Rs 120 a year");
  await shoot(page, "proto-console");

  // Rs 15,000 a month online: 0.067% of Rs 1,80,000 = Rs 120.60, floored to Rs 120 (demo.test.ts).
  await expect(user.getByText("Changes to your cards")).toBeVisible();
  await expect(
    user.getByText("Earn rate cut ~25%: per ₹150 raised to per ₹200"),
  ).toBeVisible();
  await expect(user.getByText(/Rs 120 a year/)).toBeVisible();
});
