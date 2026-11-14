import { expect, test, type Page } from "@playwright/test";
import { shoot } from "../e2e/helpers";

// PRD Sec 16.3: checkup, a change on a held card, the waiver bar, pay with, verdict. Figures are the
// ones worked by hand in tests/lib/demo.test.ts.
const FORBIDDEN =
  /guaranteed|best card in india|\binstant\b|real-time|rbi approved|unbiased|unlock|supercharge|!/i;

async function cleanCopy(page: Page) {
  expect(await page.locator("main").innerText()).not.toMatch(FORBIDDEN);
}

async function walk(page: Page, screenshots: boolean) {
  const next = () => page.getByRole("link", { name: /^Next:/ }).click();

  await expect(page.getByTestId("demo-step")).toHaveText(
    "Step 1 of 5: The checkup",
  );
  await expect(page.getByTestId("at-risk")).toHaveText("Rs 1,600");
  await expect(
    page.getByText("Rs 600 of points expire in 28 days."),
  ).toBeVisible();
  await cleanCopy(page);
  if (screenshots) await shoot(page, "demo-1-checkup");

  await next();
  await expect(page.getByTestId("demo-step")).toHaveText(
    "Step 2 of 5: A change to a card you hold",
  );
  await expect(
    page.getByText("Earn rate cut ~25%: per ₹150 raised to per ₹200"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "On what you have told us, this costs you about Rs 120 a year.",
    ),
  ).toBeVisible();
  await cleanCopy(page);
  if (screenshots) await shoot(page, "demo-2-change");

  await next();
  await expect(
    page.getByText(
      "Rs 38,000 more in 100 days to waive the fee; you are behind pace.",
    ),
  ).toBeVisible();
  await cleanCopy(page);
  if (screenshots) await shoot(page, "demo-3-waiver");

  await next();
  const top = page.getByTestId("top-card");
  await expect(top).toContainText("Tata Neu Infinity HDFC Bank Credit Card");
  await expect(top).toContainText("Rs 10 back");
  await expect(top).toContainText("UPI works on this card.");
  await expect(page.getByTestId("cannot-use")).toContainText(
    "HDFC MoneyBack+ Credit Card",
  );
  await expect(page.getByTestId("cannot-use")).toContainText(
    "HDFC Millennia Credit Card",
  );
  await cleanCopy(page);
  if (screenshots) await shoot(page, "demo-4-pay");

  await next();
  await expect(page.getByTestId("verdict-hdfc-moneyback-plus")).toContainText(
    "Keep",
  );
  await expect(page.getByTestId("verdict-hdfc-moneyback-plus")).toContainText(
    "Worth about Rs 2,480 a year",
  );
  await expect(page.getByTestId("verdict-hdfc-millennia")).toContainText(
    "Ask about a lower-fee card",
  );
  await expect(page.getByTestId("verdict-hdfc-millennia")).toContainText(
    "Costs you about Rs 40 a year more",
  );
  await expect(
    page.getByTestId("verdict-hdfc-tata-neu-infinity"),
  ).toContainText("Worth about Rs 1,921 a year");
  await cleanCopy(page);
  if (screenshots) await shoot(page, "demo-5-verdict");
}

test("investor demo: five steps with the hand-worked figures, then the same offline", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await cleanCopy(page);
  await shoot(page, "landing");
  await page.getByRole("link", { name: "See the 2-minute demo" }).click();

  await page.getByRole("button", { name: "Presenter notes" }).click();
  await expect(page.getByTestId("presenter-notes")).toContainText(
    "Rs 1,600 at risk",
  );
  await page.getByRole("button", { name: "Hide presenter notes" }).click();

  await walk(page, true);

  // Offline: the service worker serves every step from its cache.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(true);
  await page.goto("/demo/checkup");
  await walk(page, false);
  await context.setOffline(false);
});

test("the installable app has a manifest that opens the demo", async ({
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    name: "Clutch",
    start_url: "/demo/checkup",
    display: "standalone",
  });
  expect(
    manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable"),
  ).toBe(true);
});
