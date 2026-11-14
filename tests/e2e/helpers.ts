import { expect, type Page } from "@playwright/test";

// The emulator's own Google popup proved unreliable to drive (build log 2026-11-14). The test checks the
// button opens Google with no extra scopes (PRD Sec 6.1), then signs in through the Auth emulator's REST API
// and stores that session where the Firebase SDK keeps it, exactly as a finished popup sign-in would.
export async function signIn(page: Page, email: string) {
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

export async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

export async function shoot(page: Page, name: string) {
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

// Answers the age question as an adult and accepts the notice, ending on the My cards screen.
export async function onboardAdult(page: Page, email: string) {
  await signIn(page, email);
  await expect(
    page.getByRole("heading", { name: "When were you born?" }),
  ).toBeVisible();
  await page.getByLabel("Month").selectOption("1");
  await page.getByLabel("Year").selectOption("1990");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Before you add cards" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Agree and continue" }).click();
  await expect(page.getByRole("heading", { name: "My cards" })).toBeVisible();
}

// One tap per card on the My cards screen.
export async function addCards(page: Page, names: string[]) {
  for (const name of names)
    await page
      .getByRole("button", { name: new RegExp(name.replace("+", "\\+")) })
      .click();
  await expect(
    page.getByRole("list", { name: "Cards you hold" }).getByRole("listitem"),
  ).toHaveCount(names.length);
}
