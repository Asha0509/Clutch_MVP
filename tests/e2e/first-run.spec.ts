import { expect, test, type Page } from "@playwright/test";

// PRD Sec 4 journey 1 and Sec 13 step 4: sign in, age, consent, 3 cards, checkup. Runs on the emulators.
const run = Date.now();
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();

// The emulator's own Google popup proved unreliable to drive (build log 2026-11-14). The test checks the
// button opens Google with no extra scopes (PRD Sec 6.1), then signs in through the Auth emulator's REST API
// and stores that session where the Firebase SDK keeps it, exactly as a finished popup sign-in would.
async function signIn(page: Page, email: string) {
  await page.goto("/start");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const popup = await popupPromise;
  const url = new URL(popup.url());
  expect(url.searchParams.get("providerId")).toBe("google.com");
  expect(url.searchParams.get("scopes")).toBe("profile");
  await popup.close();

  const idToken = JSON.stringify({
    sub: email,
    email,
    email_verified: true,
    name: "Test User",
  });
  const res = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key",
    {
      data: {
        postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
        requestUri: "http://localhost",
        returnSecureToken: true,
      },
    },
  );
  const s = await res.json();
  await page.evaluate(
    async (user) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("firebaseLocalStorageDb", 1);
        open.onupgradeneeded = () =>
          open.result.createObjectStore("firebaseLocalStorage", {
            keyPath: "fbase_key",
          });
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(
            "firebaseLocalStorage",
            "readwrite",
          );
          tx.objectStore("firebaseLocalStorage").put({
            fbase_key: "firebase:authUser:demo-key:[DEFAULT]",
            value: user,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    {
      uid: s.localId,
      email: s.email,
      emailVerified: true,
      displayName: "Test User",
      isAnonymous: false,
      providerData: [
        {
          providerId: "google.com",
          uid: email,
          displayName: "Test User",
          email: s.email,
          phoneNumber: null,
          photoURL: null,
        },
      ],
      stsTokenManager: {
        refreshToken: s.refreshToken,
        accessToken: s.idToken,
        expirationTime: Date.now() + 3_600_000,
      },
      createdAt: String(Date.now()),
      lastLoginAt: String(Date.now()),
      apiKey: "demo-key",
      appName: "[DEFAULT]",
    },
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in to check your cards" }),
  ).toBeHidden({ timeout: 30_000 });
}

async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function shoot(page: Page, name: string) {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await noHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/screens/${name}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 900 });
}

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
