import { expect, test } from "@playwright/test";
import { shoot, signIn } from "./helpers";

// PRD Sec 4 journey 1 and Sec 13 step 4: sign in, age, consent, 3 cards, checkup. Runs on the emulators.
const run = Date.now();
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();

test("first run: 3 cards in under 3 minutes, checkup matches the hand-worked figure", async ({
  page,
}) => {
  const started = Date.now();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await shoot(page, "landing");
  await page.getByRole("link", { name: "Check my cards" }).click();
  await shoot(page, "start");

  await signIn(page, `adult-${run}@example.com`);
  await expect(
    page.getByRole("heading", { name: "When were you born?" }),
  ).toBeVisible();
  await page.getByLabel("Month").selectOption("1");
  await page.getByLabel("Year").selectOption("1990");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Before you add cards" }),
  ).toBeVisible();
  await shoot(page, "consent");
  await expect(
    page.getByRole("switch", { name: /card offers/ }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Agree and continue" }).click();

  // Three taps add three cards.
  await expect(page.getByRole("heading", { name: "My cards" })).toBeVisible();
  const held = page
    .getByRole("list", { name: "Cards you hold" })
    .getByRole("listitem");
  for (const name of [
    "HDFC MoneyBack+ Credit Card",
    "HDFC Millennia Credit Card",
    "Amazon Pay ICICI Bank Credit Card",
  ])
    await page
      .getByRole("button", { name: new RegExp(name.replace("+", "\\+")) })
      .click();
  await expect(held).toHaveCount(3);
  await shoot(page, "cards");

  // MoneyBack+: 3,000 points expiring in 20 days. Lowest stated value 20 paise: 3,000 x Rs 0.20 = Rs 600.
  await held
    .filter({ hasText: "MoneyBack+" })
    .getByRole("button", { name: "Add details" })
    .click();
  await page.getByLabel("Points or cashback balance").fill("3000");
  await page
    .getByLabel("Date the next points expire")
    .fill(
      localIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20)),
    );
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Millennia: fee month two months ago and nothing spent since, so the waiver is behind pace: Rs 1,000 at risk.
  await held
    .filter({ hasText: "Millennia" })
    .getByRole("button", { name: "Add details" })
    .click();
  await page
    .getByLabel("Month your annual fee is charged")
    .selectOption(String(((now.getMonth() + 10) % 12) + 1));
  await page.getByLabel("Spend since your fee month, in Rs").fill("0");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Same figures as tests/engine/checkup.test.ts: Rs 600 + Rs 1,000 = Rs 1,600.
  await page.getByRole("link", { name: "See my checkup" }).click();
  await expect(page.getByTestId("at-risk")).toHaveText("Rs 1,600");
  await expect(
    page.getByText("Rs 600 of points expire in 20 days.").first(),
  ).toBeVisible();
  await shoot(page, "checkup");

  expect(Date.now() - started).toBeLessThan(180_000);
});

test("under 18: shown the ask-a-parent screen and no profile is saved", async ({
  page,
  request,
}) => {
  const email = `minor-${run}@example.com`;
  await signIn(page, email);
  // Typing /cards before answering the age question leads back to it: no data screens without a profile.
  await page.goto("/cards");
  await expect(
    page.getByRole("heading", { name: "When were you born?" }),
  ).toBeVisible();
  await page.getByLabel("Month").selectOption("1");
  await page.getByLabel("Year").selectOption(String(now.getFullYear() - 16));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Clutch is for people aged 18 and over",
    }),
  ).toBeVisible();
  await shoot(page, "under-18");

  const res = await request.get(
    "http://127.0.0.1:8080/v1/projects/demo-clutch/databases/(default)/documents/users?pageSize=300",
    { headers: { Authorization: "Bearer owner" } },
  );
  expect(JSON.stringify(await res.json())).not.toContain(email);

  // The sign-in record is deleted as well, so the "nothing saved" line is true.
  await expect
    .poll(async () =>
      JSON.stringify(
        await (
          await request.get(
            "http://127.0.0.1:9099/emulator/v1/projects/demo-clutch/accounts",
            {
              headers: { Authorization: "Bearer owner" },
            },
          )
        ).json(),
      ),
    )
    .not.toContain(email);
});
